import { identify, limit } from "@/lib/guard";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 300;

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

export async function POST(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const limited = limit(who.key, "light");
  if (limited) return limited;

  // Stream-read with a hard cap (works even when the client omits Content-Length).
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.startsWith("multipart/form-data")) return Response.json({ error: "Upload a file." }, { status: 415 });
  const raw = await readCappedBytes(req, MAX_BYTES + 64 * 1024);
  if ("error" in raw) return raw.error;

  let form: FormData;
  try {
    const body = raw.bytes.buffer.slice(raw.bytes.byteOffset, raw.bytes.byteOffset + raw.bytes.byteLength) as ArrayBuffer;
    form = await new Response(body, { headers: { "content-type": ct } }).formData();
  } catch {
    return Response.json({ error: "Upload failed. Please try again." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (max 10 MB)." }, { status: 413 });
  if (!/\.(pdf|txt|md)$/i.test(file.name)) return Response.json({ error: "Only PDF, TXT or MD files are supported." }, { status: 415 });

  const buf = new Uint8Array(await file.arrayBuffer());
  const isPdf = buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // "%PDF"
  try {
    if (/\.pdf$/i.test(file.name)) {
      if (!isPdf) return Response.json({ error: "That file isn't a valid PDF." }, { status: 415 });
      const pdf = await withTimeout(getDocumentProxy(buf), 15_000);
      if (pdf.numPages > MAX_PAGES) return Response.json({ error: `PDF has ${pdf.numPages} pages — the limit is ${MAX_PAGES}.` }, { status: 413 });
      const { text } = await withTimeout(extractText(pdf, { mergePages: true }), 20_000);
      if (!text.trim()) return Response.json({ error: "This PDF has no text layer (scanned image). Paste the text instead." }, { status: 422 });
      return Response.json({ text: text.slice(0, 200_000) });
    }
    if (isPdf) return Response.json({ error: "That looks like a PDF — rename it to .pdf." }, { status: 415 });
    return Response.json({ text: new TextDecoder().decode(buf).slice(0, 200_000) });
  } catch (e) {
    console.error("[extract]", e instanceof Error ? e.message : e);
    return Response.json({ error: "Could not read this file." }, { status: 422 });
  }
}

async function readCappedBytes(req: Request, max: number): Promise<{ bytes: Uint8Array } | { error: Response }> {
  // Reuse the text reader's cap logic but keep binary bytes intact.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max) return { error: Response.json({ error: "File too large (max 10 MB)." }, { status: 413 }) };
  if (!req.body) return { bytes: new Uint8Array() };
  const reader = req.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return { error: Response.json({ error: "File too large (max 10 MB)." }, { status: 413 }) };
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.byteLength;
  }
  return { bytes: out };
}

