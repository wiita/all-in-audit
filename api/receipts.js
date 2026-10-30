// /receipts: what came due this week and how it scored, what's due next week, and a ready-to-post X draft.
const { loadRows, originOf, esc, fmtDate, pathOf } = require("./_data");
const { page } = require("./c");

const SITE = "https://allin.fan";
const SHORT = { "Chamath Palihapitiya": "Chamath", "David Sacks": "Sacks", "David Friedberg": "Friedberg", "Jason Calacanis": "Jason" };
const MARK = { Accurate: "✅", False: "❌", Misleading: "⚠️", Unverified: "❔", Pending: "⏳" };
const day = d => Date.parse(d + "T00:00:00Z");
const clip = (s, n) => { s = String(s || "").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const rows = await loadRows(originOf(req));
  const now = new Date(); const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const W = 7 * 864e5;
  const preds = rows.filter(r => r.type === "Prediction" && /^\d{4}-\d{2}-\d{2}$/.test(r.target || ""));

  let came = preds.filter(r => day(r.target) <= today && day(r.target) > today - W).sort((a, b) => a.target.localeCompare(b.target));
  let cameLabel = "Came due this week";
  if (!came.length) {
    came = preds.filter(r => r.verdict !== "Pending" && day(r.target) <= today).sort((a, b) => b.target.localeCompare(a.target)).slice(0, 4);
    cameLabel = "Most recently scored";
  }
  const next = preds.filter(r => r.verdict === "Pending" && day(r.target) > today && day(r.target) <= today + W).sort((a, b) => a.target.localeCompare(b.target));

  // X draft, kept under 280 characters (links count as 23).
  const line = r => `${MARK[r.verdict] || "•"} ${SHORT[r.speaker] || r.speaker}: ${clip(r.claim, 70)}${r.verdict === "Pending" ? " (being scored)" : ""}`;
  const head = cameLabel === "Came due this week" ? "This week's All-In receipts 🧾" : "All-In receipts 🧾";
  const tail = `${next.length ? `\nDue next week: ${next.length} call${next.length === 1 ? "" : "s"}` : ""}\n`;
  let picked = [];
  for (const r of came) {
    const t = [head, ...picked.map(line), line(r)].join("\n") + tail;
    if (t.length + 23 <= 275) picked.push(r); else break;
  }
  const draft = [head, ...picked.map(line)].join("\n") + tail + `${SITE}/receipts`;
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(draft)}`;

  const card = r => `<article class="entry e-${esc(r.verdict)}"><div class="meta"><span class="who">${esc(r.speaker)}</span><span class="chip v-${esc(r.verdict)}">${esc(r.verdict)}</span>${r.auto ? '<span class="autotag">Auto-rated · awaiting review</span>' : ""}<span>Said ${fmtDate(r.date)}</span><span>Due ${fmtDate(r.target)}</span></div><p class="claim"><a href="${esc(pathOf(r))}">${esc(r.claim)}</a></p></article>`;

  const body = `
    <style>
      .draft{font-family:var(--sans);background:var(--sheet);border:1px solid var(--rule);border-radius:12px;padding:1rem 1.1rem;margin:1.4rem 0 .6rem}
      .draft pre{white-space:pre-wrap;margin:0 0 .9rem;font:inherit;font-size:.95rem;line-height:1.5;color:var(--ink)}
      .draft .n{font-size:.75rem;color:var(--pencil)}
      .list{display:flex;flex-direction:column;gap:.7rem}
      .cpage h2{font-size:1.2rem;margin:2.2rem 0 .9rem}
    </style>
    <p class="kicker">Weekly receipts</p>
    <h1>This week's receipts</h1>
    <p class="lede">Every Friday: the predictions that came due, how they scored, and what is due next. Scores follow the rule fixed for each prediction before the outcome was known.</p>
    <div class="draft"><pre id="draft">${esc(draft)}</pre>
      <div class="share"><a href="${esc(xHref)}" target="_blank" rel="noopener">Post on X</a><button type="button" data-copy="${esc(draft)}">Copy text</button><span class="n">${draft.length - `${SITE}/receipts`.length + 23} of 280 characters</span></div></div>
    <h2>${cameLabel}</h2>
    <div class="list">${came.map(card).join("") || '<p class="note">Nothing came due this week.</p>'}</div>
    <h2>Due in the next 7 days</h2>
    <div class="list">${next.map(card).join("") || '<p class="note">Nothing due in the next 7 days.</p>'}</div>
    <p class="note" style="margin-top:2rem">All open predictions are on the <a href="/#predictions">homepage</a>. How predictions are scored: <a href="/methodology">methodology</a>.</p>`;

  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  return res.status(200).send(page({ title: "Weekly receipts · The All-In Audit", desc: "The All-In hosts' predictions that came due this week, how they scored, and what's due next.", url: SITE + "/receipts", image: SITE + "/og/home.png", body }));
};
