// /api/markets: open predictions that have a matching prediction market, with live odds for the host's call.
const { loadRows, originOf, pathOf } = require("./_data");
const { odds, mapped } = require("./_markets");

module.exports = async function handler(req, res) {
  const rows = await loadRows(originOf(req));
  const open = rows.filter(r => r.type === "Prediction" && r.verdict === "Pending" && mapped(r.id));
  const out = (await Promise.all(open.map(async r => {
    const o = await odds(r).catch(() => null);
    if (!o) return null;
    const avg = o.venues.reduce((a, v) => a + v.p, 0) / o.venues.length;
    return { id: r.id, speaker: r.speaker, claim: r.claim, date: r.date, target: r.target, path: pathOf(r), market: o.label, fit: o.fit, avg, venues: o.venues.map(v => ({ name: v.name, p: v.p, url: v.url })) };
  }))).filter(Boolean).sort((a, b) => (a.target || "9").localeCompare(b.target || "9"));
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).send(JSON.stringify({ updated: new Date().toISOString(), items: out }));
};
