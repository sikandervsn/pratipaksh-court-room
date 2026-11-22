// Usage: node scripts/harvest-india-code.mjs data/library-raw.json   (then: npm run build:library data/library-raw.json)
// Harvest official section texts from India Code (Govt. of India) via its DSpace REST API.
// Output: JSON array of { act, code, year, section, heading, text, url } — central Acts only.
import fs from "node:fs";

const BASE = "https://indiacode.gov.in/server/api";
const UA = { "User-Agent": "Mozilla/5.0 (Pratipaksh legal research tool; polite crawler)" };
const OUT = process.argv[2] ?? "library.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ACTS = [
  ["ICA", "The Indian Contract Act, 1872"],
  ["TPA", "The Transfer of Property Act, 1882"],
  ["SRA", "The Specific Relief Act, 1963"],
  ["LIM", "The Limitation Act, 1963"],
  ["ARB", "The Arbitration and Conciliation Act, 1996"],
  ["CPA", "The Consumer Protection Act, 2019"],
  ["NIA", "The Negotiable Instruments Act, 1881"],
  ["REG", "The Registration Act, 1908"],
  ["STAMP", "The Indian Stamp Act, 1899"],
  ["COW", "The Code on Wages, 2019"],
  ["DPDP", "The Digital Personal Data Protection Act, 2023"],
  ["BNS", "The Bharatiya Nyaya Sanhita, 2023"],
  ["BNSS", "The Bharatiya Nagarik Suraksha Sanhita, 2023"],
  ["BSA", "The Bharatiya Sakshya Adhiniyam, 2023"],
  ["IT", "The Information Technology Act, 2000"],
];

const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const g = (m, k) => m[k]?.[0]?.value;

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      throw new Error(`${r.status}`);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}

const library = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];
const done = new Set(library.map((s) => s.code));

for (const [code, title] of ACTS) {
  if (done.has(code)) {
    console.log(`= ${code} already harvested`);
    continue;
  }
  const want = norm(title);
  const sections = new Map();
  let page = 0;
  let total = Infinity;
  while (page * 100 < Math.min(total, 3000)) {
    const url = `${BASE}/discover/search/objects?query=${encodeURIComponent(`"${title}"`)}&dsoType=ITEM&size=100&page=${page}`;
    const j = await getJson(url);
    const sr = j._embedded.searchResult;
    total = sr.page.totalElements;
    for (const o of sr._embedded.objects) {
      const it = o._embedded.indexableObject;
      const m = it.metadata;
      if (g(m, "dc.identifier.collection") !== "SECTION") continue;
      if (norm(g(m, "dc.identifier.act_name")) !== want) continue;
      if (!String(g(m, "dc.identifier.act_id")).startsWith("AC_CEN")) continue;
      if (g(m, "dc.identifier.repealed") === "true") continue;
      const text = (g(m, "dc.identifier.section_page_note") ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const order = Number(g(m, "dc.identifier.section_number")) || 0;
      // Real section number is at the start of the text, e.g. "27. Agreement in restraint of trade, void.—"
      const sm = text.match(/^\s*\[?\s*(\d{1,3}[A-Z]{0,2})\s*[.\]]/);
      const section = sm ? sm[1] : String(order);
      const heading = (it.name ?? g(m, "dc.title") ?? "").trim();
      const key = `${section}|${heading}`;
      if (!sections.has(key)) sections.set(key, { act: title.replace(/^The /, ""), code, section, order, heading, text, url: g(m, "dc.identifier.uri") ?? "" });
    }
    page++;
    await sleep(400);
  }
  const list = [...sections.values()].sort((a, b) => a.order - b.order);
  library.push(...list);
  fs.writeFileSync(OUT, JSON.stringify(library));
  console.log(`✓ ${code}: ${list.length} sections (search total ${total})`);
}
console.log(`TOTAL ${library.length} sections`);
