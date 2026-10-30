// Corrections log: /corrections. Lists every published entry whose verdict or wording was changed after publication.
// Convention in the sheet's Notes column: a note starting "Correction (YYYY-MM-DD):" or "Re-rated" marks a change.
const { loadRows, originOf, esc, fmtDate, pathOf } = require("./_data");
const { page } = require("./c");
const SITE = "https://allin.fan";
const RE = /(Correction\s*\((\d{4}-\d{2}-\d{2})\)\s*:|Re-rated)/i;

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const rows = await loadRows(originOf(req));
  const fixed = rows.filter(r => RE.test(r.notes || ""))
    .map(r => { const m = (r.notes || "").match(/Correction\s*\((\d{4}-\d{2}-\d{2})\)/i); return { r, when: m ? m[1] : "" }; })
    .sort((a, b) => (b.when || b.r.date).localeCompare(a.when || a.r.date));
  const item = ({ r, when }) => `<article class="entry e-${esc(r.verdict)}">
      <div class="meta"><span class="who">${esc(r.speaker)}</span><span>Now: <span class="chip v-${esc(r.verdict)}">${esc(r.verdict)}</span></span><span>Said ${fmtDate(r.date)}</span>${when ? `<span>Corrected ${fmtDate(when)}</span>` : ""}</div>
      <p class="claim"><a href="${esc(pathOf(r))}">${esc(r.claim)}</a></p>
      <p class="note" style="margin:0">${esc(r.notes)}</p>
    </article>`;
  const body = `
    <p class="kicker">Corrections</p>
    <h1>Corrections log</h1>
    <p class="lede">Every change to a published verdict, in the open. When a host, a reader or our own re-check shows a verdict was wrong, the entry is fixed and the change is logged here with the reason.</p>
    <p class="note">To request one, use the <a href="https://github.com/wiita/all-in-audit/issues/new?template=correction.yml">correction form</a> with a source. Requests are reviewed against the same <a href="/methodology">methodology</a> as everything else.</p>
    <h2 style="font-size:1.2rem;margin:2.2rem 0 .9rem">${fixed.length} correction${fixed.length === 1 ? "" : "s"}</h2>
    <div class="more" style="display:flex;flex-direction:column;gap:.8rem">${fixed.map(item).join("") || '<p class="note">No corrections yet.</p>'}</div>`;
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  return res.status(200).send(page({ title: "Corrections log · The All-In Audit", desc: "Every change to a published verdict on The All-In Audit, with the reason.", url: SITE + "/corrections", image: SITE + "/og/home.png", body }));
};
