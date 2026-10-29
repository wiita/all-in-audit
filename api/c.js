// Claim page: /c/<ID>. Server-rendered so link previews (X, LinkedIn, iMessage) get the title and share image.
const { loadRows, originOf, esc, fmtDate, hostOf, ID_RE, pathOf, idFromSlug } = require("./_data");

const XICON = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>';
const SITE = "https://allin.fan";

function page({ title, desc, url, image, body, status }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="The All-In Audit">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@wiitapur">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
${status === 404 ? '<meta name="robots" content="noindex">' : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<style>
  .cpage{max-width:46rem;padding:3rem 0 0}
  .cpage .entry{padding:1.4rem 1.5rem;gap:.7rem}
  .cpage .entry blockquote{font-size:1.35rem;line-height:1.4}
  .cpage .entry .claim{font-size:1.02rem}
  .cpage h2{font-size:1.1rem;margin:2.2rem 0 .8rem}
  .ev p{margin:0 0 .6rem}
  .more{display:flex;flex-direction:column;gap:.7rem}
  .back{font-family:var(--sans);font-size:.9rem;margin:0 0 1.2rem}
  .copied{color:var(--acc)}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <strong><a href="/">The All-In Audit</a></strong>
    <nav aria-label="Site"><a href="/#scorecard">Scorecard</a><a href="/#predictions">Predictions</a><a href="/#claims">All claims</a><a href="/game">Game</a><a href="/methodology">Methodology</a><a class="xlink" href="https://x.com/wiitapur" target="_blank" rel="noopener" aria-label="Follow @wiitapur on X">${XICON.replace(/13/g, "15")}</a></nav>
  </header>
  <main class="cpage">
${body}
  </main>
  <footer>
    <span>An independent audit by <a class="xfoot" href="https://x.com/wiitapur" target="_blank" rel="noopener">${XICON.replace(/13/g, "12")}@wiitapur</a>. Not affiliated with the All-In Podcast. Quotes are short excerpts for commentary; listen to the full episodes on the show's own channels.</span>
    <span>Spotted an error? <a href="https://github.com/wiita/all-in-audit/issues/new?template=correction.yml">Request a correction</a></span>
  </footer>
</div>
<script>
document.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent="Copied";b.classList.add("copied");}catch(e){prompt("Copy this link",b.dataset.copy);}
}));
</script>
</body>
</html>`;
}

function mini(r) {
  return `<article class="entry e-${esc(r.verdict)}">
      <div class="meta"><span class="chip v-${esc(r.verdict)}">${esc(r.verdict)}</span><span>${fmtDate(r.date)}</span><span>${esc(r.category)}</span></div>
      <p class="claim"><a href="${esc(pathOf(r))}">${esc(r.claim)}</a></p>
    </article>`;
}

module.exports = async function handler(req, res) {
  const qy = req.query || {};
  const id = qy.slug ? idFromSlug(qy.slug) : String(qy.id || "").trim().toUpperCase();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const rows = ID_RE.test(id) ? await loadRows(originOf(req)) : [];
  const r = rows.find(x => x.id === id);

  if (!r) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(404).send(page({
      title: "Claim not found · The All-In Audit", desc: "This claim isn't in the published record.", url: SITE, image: SITE + "/og/home.png", status: 404,
      body: `    <p class="kicker">Not found</p><h1>That claim isn't in the record.</h1><p class="lede">It may have an old link or not be published yet. <a href="/#claims">Browse all claims</a>.</p>`
    }));
  }

  const path = pathOf(r);
  const asked = qy.slug ? `/${String(qy.v || "").toLowerCase()}/${qy.slug}` : "";
  if (asked !== path) { res.setHeader("Cache-Control", "public, s-maxage=300"); res.setHeader("Location", path); return res.status(301).send(""); }
  const url = SITE + path;
  const title = `${String(r.verdict).toUpperCase()}: ${r.speaker} on All-In, ${fmtDate(r.date)}`;
  const desc = `Claim: ${r.claim} Evidence and sources on The All-In Audit.`.slice(0, 280);
  const xText = `${String(r.verdict).toUpperCase()}: ${r.speaker} on All-In (${fmtDate(r.date)})`;
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(url)}`;
  const xPaste = `${xText}\n${url}`;
  const src = r.sources.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(hostOf(u))}</a>`).join("");
  const due = r.type === "Prediction" && r.target ? `<span>Due ${fmtDate(r.target)}</span>` : "";
  const more = rows.filter(x => x.speaker === r.speaker && x.id !== r.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const body = `    <p class="back"><a href="/#claims">← All claims</a></p>
    <p class="kicker">${esc(r.type === "Prediction" ? "Prediction" : "Claim")} · ${esc(r.id)}</p>
    <article class="entry e-${esc(r.verdict)}">
      <div class="meta"><span class="who">${esc(r.speaker)}</span><span class="chip v-${esc(r.verdict)}">${esc(r.verdict)}</span>${r.lean !== "Neutral" ? `<span class="leanpill l-${esc(r.lean)}">${esc(r.lean)}</span>` : ""}<span><a href="${esc(r.url)}" target="_blank" rel="noopener">${fmtDate(r.date)}</a> at ${esc(r.ts)}</span><span>${esc(r.category)}</span>${due}</div>
      <blockquote>“${esc(r.quote)}”</blockquote>
      <p class="claim"><strong>Claim:</strong> ${esc(r.claim)}</p>
      <div class="ev"><p><strong>Evidence.</strong> ${esc(r.evidence)}</p>${r.notes ? `<p class="note">${esc(r.notes)}</p>` : ""}</div>
      <div class="srcs">${src}</div>
      <div class="share"><a href="${esc(xHref)}" target="_blank" rel="noopener">${XICON} Post on X</a><button type="button" data-copy="${esc(xPaste)}">Copy for X</button><button type="button" data-copy="${esc(url)}">Copy link</button><span>Episode: ${esc(r.title)}</span></div>
    </article>
    <p class="note" style="margin-top:1rem">Verdicts follow the published <a href="/methodology">methodology</a>. Think this one is wrong? <a href="https://github.com/wiita/all-in-audit/issues/new?template=correction.yml&title=${encodeURIComponent("Correction: " + r.id)}">Request a correction</a>.</p>
    ${more.length ? `<h2>More from ${esc(r.speaker)}</h2><div class="more">${more.map(mini).join("")}</div>` : ""}`;

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  return res.status(200).send(page({ title, desc, url, image: `${SITE}/og/${r.id}.png`, body }));
};
