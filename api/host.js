// Host page: /sacks, /chamath, /friedberg, /jason. Server-rendered running record for one host.
const { loadRows, originOf, esc, fmtDate, pathOf } = require("./_data");
const { page, mini } = require("./c");

const SITE = "https://allin.fan";
const HOSTS = {
  chamath: "Chamath Palihapitiya", palihapitiya: "Chamath Palihapitiya",
  sacks: "David Sacks",
  friedberg: "David Friedberg",
  jason: "Jason Calacanis", calacanis: "Jason Calacanis", jcal: "Jason Calacanis"
};
const CANON = { "Chamath Palihapitiya": "chamath", "David Sacks": "sacks", "David Friedberg": "friedberg", "Jason Calacanis": "jason" };
const RATED = ["Accurate", "Misleading", "False"];
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

async function absences(origin) {
  try { const r = await fetch(origin + "/data/appearances.json"); return (await r.json()).absent || {}; } catch (e) { return {}; }
}

function quarter(d) { const [y, m] = d.split("-").map(Number); return `${y} Q${Math.ceil(m / 3)}`; }

module.exports = async function handler(req, res) {
  const key = String((req.query || {}).h || "").toLowerCase();
  const name = HOSTS[key];
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!name) return res.status(404).send(page({ title: "Not found · The All-In Audit", desc: "", url: SITE, image: SITE + "/og/home.png", status: 404, body: `<h1>Not found</h1>` }));
  const slug = CANON[name];
  if (key !== slug) { res.setHeader("Location", "/" + slug); return res.status(301).send(""); }

  const origin = originOf(req);
  const [rows, absent] = await Promise.all([loadRows(origin), absences(origin)]);
  const eps = [...new Set(rows.map(r => r.episode || r.url))];
  const on = [...new Set(rows.map(r => r.url))].filter(u => { const id = (u.match(/i=(\d+)/) || [])[1]; return !(absent[id] || []).includes(name); }).length;
  const mine = rows.filter(r => r.speaker === name).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const rated = mine.filter(r => RATED.includes(r.verdict));
  const c = v => rated.filter(r => r.verdict === v).length;
  const preds = mine.filter(r => r.type === "Prediction");
  const open = preds.filter(r => r.verdict === "Pending").sort((a, b) => (a.target || "9").localeCompare(b.target || "9"));
  const resolved = preds.filter(r => r.verdict !== "Pending" && r.verdict !== "Unverified");
  const hits = resolved.filter(r => r.verdict === "Accurate").length;
  const misses = resolved.filter(r => r.verdict === "False").length;

  // other hosts, for comparison
  const all = Object.keys(CANON).map(h => { const rr = rows.filter(r => r.speaker === h && RATED.includes(r.verdict)); return { h, n: rr.length, f: rr.filter(r => r.verdict === "False").length, m: rr.filter(r => r.verdict === "Misleading").length }; });
  const rank = [...all].sort((a, b) => pct(b.f, b.n) - pct(a.f, a.n)).findIndex(x => x.h === name) + 1;

  // record over time (by quarter)
  const qs = {};
  rated.forEach(r => { const q = quarter(r.date); (qs[q] = qs[q] || { n: 0, bad: 0 }); qs[q].n++; if (r.verdict !== "Accurate") qs[q].bad++; });
  const qrows = Object.keys(qs).sort().map(q => { const v = qs[q]; const p = pct(v.bad, v.n);
    return `<tr><th scope="row">${esc(q)}</th><td>${v.n}</td><td class="fal"><span class="track" aria-hidden="true"><span class="bar" style="width:${Math.max(2, Math.round(p * 1.2))}px"></span></span><span class="pctv">${p}%</span></td></tr>`; }).join("");

  // topics
  const cats = {};
  rated.forEach(r => { (cats[r.category] = cats[r.category] || { n: 0, bad: 0 }); cats[r.category].n++; if (r.verdict !== "Accurate") cats[r.category].bad++; });
  const crow = Object.entries(cats).sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v.n}</td><td>${pct(v.bad, v.n)}%</td></tr>`).join("");

  const wrong = mine.filter(r => r.verdict === "False" || r.verdict === "Misleading").slice(0, 8);
  const predCard = r => `<article class="entry e-${esc(r.verdict)}"><div class="meta"><span class="chip v-${esc(r.verdict)}">${esc(r.verdict)}</span>${r.auto?'<span class="autotag" title="Rated automatically from the transcript; the editor has not reviewed it yet">Auto-rated · awaiting review</span>':''}<span>Said ${fmtDate(r.date)}</span>${r.target ? `<span>${r.verdict === "Pending" ? "Due" : "Resolved"} ${fmtDate(r.target)}</span>` : ""}</div><p class="claim"><a href="${esc(pathOf(r))}">${esc(r.claim)}</a></p></article>`;

  const fr = pct(c("False"), rated.length), mr = pct(c("Misleading"), rated.length);
  const first = mine.length ? mine[mine.length - 1].date : "", last = mine.length ? mine[0].date : "";
  const url = `${SITE}/${slug}`;
  const title = `${name}'s record on All-In · The All-In Audit`;
  const desc = `${rated.length} rated claims: ${c("Accurate")} accurate, ${c("Misleading")} misleading, ${c("False")} false. ${open.length} open predictions. Sourced, quote by quote.`;
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(`${name} on All-In: ${c("False")} false and ${c("Misleading")} misleading out of ${rated.length} rated claims (${fr}% false). The receipts:`)}&url=${encodeURIComponent(url)}`;

  const body = `
    <style>
      .cpage{max-width:64rem}
      .hstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr));gap:1rem 1.5rem;margin:1.6rem 0 .6rem;padding:1.3rem 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
      .hstats div{display:flex;flex-direction:column}
      .hstats b{font-size:2.1rem;font-weight:500;letter-spacing:-.05em;line-height:1;color:var(--brand);font-variant-numeric:tabular-nums}
      .hstats span{font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;color:var(--pencil);margin-top:.45rem}
      .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:1.5rem}
      .cpage h2{font-size:1.3rem;margin:2.4rem 0 .9rem}
      .list{display:flex;flex-direction:column;gap:.7rem}
      td.fal{color:var(--fal);font-weight:600}
      .track{display:inline-block;width:120px;text-align:left;vertical-align:middle;margin-right:.6rem;line-height:0}
      .hosts{display:flex;flex-wrap:wrap;gap:.4rem .9rem;font-size:.9rem;margin:0 0 1.2rem}
      .hosts a[aria-current]{font-weight:650;color:var(--brand);text-decoration:none}
      details.all summary{cursor:pointer;font-weight:600;margin:2.4rem 0 .9rem}
    </style>
    <nav class="hosts" aria-label="Hosts">${Object.entries(CANON).map(([h, s]) => `<a href="/${s}"${h === name ? ' aria-current="page"' : ""}>${esc(h)}</a>`).join("")}</nav>
    <p class="kicker">Host record</p>
    <h1>${esc(name)}</h1>
    <p class="lede">On ${on} of ${eps.length} episodes in the record${first ? `, ${fmtDate(first)} to ${fmtDate(last)}` : ""}. ${fr}% of rated claims false, ${mr}% misleading. ${rank === 1 ? "Highest" : rank === 4 ? "Lowest" : rank === 2 ? "Second-highest" : "Third-highest"} false rate of the four hosts.</p>
    <div class="hstats">
      <div><b>${rated.length}</b><span>Rated claims</span></div>
      <div><b>${c("Accurate")}</b><span>Accurate</span></div>
      <div><b>${c("Misleading")}</b><span>Misleading</span></div>
      <div><b>${c("False")}</b><span>False</span></div>
      <div><b>${open.length}</b><span>Open predictions</span></div>
      <div><b>${hits}–${misses}</b><span>Predictions right–wrong</span></div>
    </div>
    <div class="share"><a href="${esc(xHref)}" target="_blank" rel="noopener">Share this record on X</a><a href="/#scorecard">Compare all four</a></div>

    ${wrong.length ? `<h2>Latest false and misleading</h2><div class="list">${wrong.map(mini).join("")}</div>` : ""}

    <div class="cols">
      <div><h2>Open predictions</h2><div class="list">${open.map(predCard).join("") || '<p class="note">None open.</p>'}</div></div>
      <div><h2>Resolved predictions</h2><div class="list">${resolved.map(predCard).join("") || '<p class="note">None resolved yet.</p>'}</div></div>
    </div>

    <div class="cols">
      <div><h2>Record over time</h2><div class="tablebox"><table class="ledger"><thead><tr><th scope="col">Quarter</th><th scope="col">Rated</th><th scope="col">Misleading or false</th></tr></thead><tbody>${qrows}</tbody></table></div><p class="note">By the date the claim was made. Small quarters swing a lot.</p></div>
      <div><h2>By topic</h2><div class="tablebox"><table class="ledger"><thead><tr><th scope="col">Topic</th><th scope="col">Rated</th><th scope="col">Misleading or false</th></tr></thead><tbody>${crow}</tbody></table></div></div>
    </div>

    <details class="all"><summary>All ${mine.length} statements by ${esc(name)}</summary><div class="list">${mine.map(mini).join("")}</div></details>
    <p class="note" style="margin-top:2rem">Which claims get checked affects these numbers; see the <a href="/methodology">methodology</a>. Episode counts come from who is on each episode.</p>`;

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  return res.status(200).send(page({ title, desc, url, image: `${SITE}/og/home.png`, body }));
};
