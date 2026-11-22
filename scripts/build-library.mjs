// Builds the statute library used for retrieval (F1) and exact-quote verification (F2).
//
//   node scripts/build-library.mjs <harvested-library.json>
//
// Input: raw section records harvested from India Code (indiacode.gov.in, Govt. of India).
// Output:
//   src/data/statutes.json        cleaned sections { id, code, act, section, heading, text, notes, url }
//   src/data/statute-chunks.json  retrieval chunks { sid, part, text }
//   src/data/statute-vectors.json int8-quantised Gemini embeddings (768 dims) per chunk, base64 (optional)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
if (!input) throw new Error("usage: node scripts/build-library.mjs <library.json>");
const raw = JSON.parse(fs.readFileSync(input, "utf8"));

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

function clean(html) {
  let s = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<sup>\s*\d+\s*<\/sup>/gi, "") // amendment footnote markers
    .replace(/<[^>]+>/g, "");
  s = decode(s);
  const lines = s.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
  const body = [];
  const notes = [];
  for (const l of lines) {
    if (/^\d+\.\s*(Subs\.|Ins\.|Omitted|Added|Rep\.|Renumbered|The words|The brackets|Certain words|Clause|Cl\.|Sub-section|Section|S\.|Explanation|Proviso|Now see|Vide|This section|These words|Ss\.)/i.test(l) && body.length) notes.push(l);
    else if (notes.length && /^\d+\.\s/.test(l) && /Act\s+\d+\s+of\s+\d{4}|w\.e\.f\./i.test(l)) notes.push(l);
    else body.push(l);
  }
  let text = body.join("\n");
  text = text.replace(/\[(?=[A-Za-z(“"'])/g, "").replace(/\s*\]\s*(?=[.,;:—\-)\s]|$)/g, "").replace(/\*\s*\*\s*\*(\s*\*)*/g, "* * *");
  return { text: text.trim(), notes };
}

const seen = new Map();
const statutes = [];
for (const r of raw) {
  const { text, notes } = clean(r.text);
  if (text.length < 20) continue;
  let id = `${r.code}-${r.section}`;
  const n = (seen.get(id) ?? 0) + 1;
  seen.set(id, n);
  if (n > 1) id = `${id}#${n}`;
  // India Code moved to indiacode.gov.in; handle links resolve there.
  const url = (r.url || "").replace(/^https?:\/\/(test1\.|www\.)?indiacode\.nic\.in/, "https://indiacode.gov.in");
  statutes.push({ id, code: r.code, act: r.act, section: r.section, heading: r.heading.replace(/\.$/, ""), text, notes, url });
}

// Chunk long sections (e.g. definitions) on sub-clause boundaries, ~1400 chars per chunk.
const chunks = [];
for (const s of statutes) {
  const header = `${s.act}, s. ${s.section} — ${s.heading}`;
  if (s.text.length <= 1600) {
    chunks.push({ sid: s.id, part: 0, text: `${header}\n${s.text}` });
    continue;
  }
  const paras = s.text.split("\n");
  let buf = "";
  let part = 0;
  for (const p of paras) {
    if (buf && buf.length + p.length > 1400) {
      chunks.push({ sid: s.id, part: part++, text: `${header} (part ${part})\n${buf.trim()}` });
      buf = "";
    }
    buf += p + "\n";
  }
  if (buf.trim()) chunks.push({ sid: s.id, part: part++, text: `${header} (part ${part})\n${buf.trim()}` });
}

const dataDir = path.join(root, "src", "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "statutes.json"), JSON.stringify(statutes));
fs.writeFileSync(path.join(dataDir, "statute-chunks.json"), JSON.stringify(chunks));
const byAct = statutes.reduce((a, s) => ((a[s.code] = (a[s.code] ?? 0) + 1), a), {});
console.log(`statutes: ${statutes.length} sections`, byAct, `chunks: ${chunks.length}`);

// ── Embeddings (Gemini, via OpenAI-compatible endpoint) ──
const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const KEY = env.match(/^GEMINI_API_KEY=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!KEY) {
  console.log("No GEMINI_API_KEY — skipping embeddings (search will be keyword-only).");
  process.exit(0);
}
const DIMS = 768;
const vecs = new Int8Array(chunks.length * DIMS);
const BATCH = Number(process.env.EMBED_BATCH ?? 30);
// Resumable: progress is checkpointed so a rate-limit stall or crash doesn't lose finished batches.
const ckpt = path.join((await import("node:os")).tmpdir(), `pratipaksh-vectors-${chunks.length}.bin`);
let start = 0;
if (fs.existsSync(ckpt)) {
  const buf = fs.readFileSync(ckpt);
  start = buf.readUInt32LE(0);
  vecs.set(new Int8Array(buf.buffer, buf.byteOffset + 4, chunks.length * DIMS));
  console.log(`  resuming from chunk ${start}`);
}
for (let i = start; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH).map((c) => c.text.slice(0, 6000));
  let data;
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemini-embedding-001", input: batch, dimensions: DIMS }),
    });
    if (r.ok) {
      data = (await r.json()).data;
      break;
    }
    const body = await r.text().catch(() => "");
    const ra = Number(r.headers.get("retry-after")) || 0;
    const wait = r.status === 429 ? Math.max(ra * 1000, 20_000) : 5_000;
    console.log(`  batch ${i}: HTTP ${r.status} ${body.slice(0, 160).replace(/\s+/g, " ")} — retrying in ${wait / 1000}s`);
    await new Promise((res) => setTimeout(res, wait));
  }
  if (!data) throw new Error(`embedding failed at batch ${i}`);
  data.forEach((d, k) => {
    const v = d.embedding;
    const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
    for (let j = 0; j < DIMS; j++) vecs[(i + k) * DIMS + j] = Math.max(-127, Math.min(127, Math.round((v[j] / norm) * 127)));
  });
  const done = Math.min(i + BATCH, chunks.length);
  const out = Buffer.alloc(4 + vecs.byteLength);
  out.writeUInt32LE(done, 0);
  Buffer.from(vecs.buffer).copy(out, 4);
  fs.writeFileSync(ckpt, out);
  console.log(`  embedded ${done}/${chunks.length}`);
  await new Promise((res) => setTimeout(res, 700));
}
fs.rmSync(ckpt, { force: true });
fs.writeFileSync(path.join(dataDir, "statute-vectors.json"), JSON.stringify({ model: "gemini-embedding-001", dims: DIMS, count: chunks.length, b64: Buffer.from(vecs.buffer).toString("base64") }));
console.log(`\nvectors: ${chunks.length} × ${DIMS} (int8) → ${(vecs.byteLength / 1024 / 1024).toFixed(1)} MB`);
