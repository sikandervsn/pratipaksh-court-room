import { identify, limit } from "@/lib/guard";
import { ACTS, embedQueries, lookupSection, search, STATUTE_BY_ID } from "@/lib/library";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.slice(0, 20);
  if (id) {
    const s = STATUTE_BY_ID[id];
    return s ? Response.json({ section: s }) : Response.json({ error: "Section not found." }, { status: 404 });
  }
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 300);
  const acts = (url.searchParams.get("acts") ?? "").split(",").filter((a) => ACTS.some((x) => x.code === a));
  if (!q) return Response.json({ acts: ACTS, results: [] });
  const limited = limit(who.key, "light");
  if (limited) return limited;
  const direct = lookupSection(q);
  const vec = (await embedQueries([q]))?.[0] ?? null;
  const hits = search(q, { k: 10, acts, vector: vec });
  const results = [...(direct ? [{ statute: direct, via: ["citation"] }] : []), ...hits.filter((h) => h.statute.id !== direct?.id)].slice(0, 10).map((h) => ({
    id: h.statute.id,
    act: h.statute.act,
    section: h.statute.section,
    heading: h.statute.heading,
    text: h.statute.text.length > 1800 ? h.statute.text.slice(0, 1800) + " …" : h.statute.text,
    url: h.statute.url,
    via: h.via,
  }));
  return Response.json({ acts: ACTS, mode: vec ? "hybrid" : "keyword", results });
}
