// Shared loader for the serverless functions: reads the published sheet (Published rows only),
// caches it briefly per instance, and falls back to the bundled snapshot.
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQVWAaJsVwxEtcdSEB-dS72P4P7-PdUwfScK7Dloz6oNJ3XuuliI2EYD6mnxCI5SbWBZ5jq_ZqoQutf/pub?gid=961918255&single=true&output=csv";
const TTL = 5 * 60 * 1000;
let cache = null;

function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift() || [];
  return rows.filter(r => r.some(x => x.trim() !== "")).map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || "").trim()])));
}

function clean(r) {
  return {
    id: r.ID, status: r.Status, type: r.Type, date: r.Date, title: r.EpisodeTitle, url: r.EpisodeURL, ts: r.Timestamp,
    speaker: r.Speaker, quote: r.Quote, claim: r.Claim, category: r.Category, verdict: r.Verdict, evidence: r.Evidence,
    sources: (r.Sources || "").split("|").map(s => s.trim()).filter(s => /^https?:\/\//.test(s)),
    target: r.TargetDate, notes: r.Notes, lean: r.Lean || "Neutral"
  };
}

async function loadRows(origin) {
  if (cache && Date.now() - cache.t < TTL) return cache.rows;
  let rows = null;
  try {
    const r = await fetch(SHEET_CSV_URL);
    if (r.ok) rows = parseCSV(await r.text()).filter(x => x.ID && x.Status === "Published").map(clean);
  } catch (e) {}
  if (!rows || !rows.length) {
    try {
      const r = await fetch(origin + "/data/snapshot.json");
      rows = (await r.json()).rows.map(clean);
    } catch (e) { rows = []; }
  }
  cache = { t: Date.now(), rows };
  return rows;
}

function originOf(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "allin.fan";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return proto + "://" + host;
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = d => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return d || ""; const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } };
const ID_RE = /^AIA-\d{8}-\d{2,3}$/;
const VERDICT_SLUGS = ["accurate", "misleading", "false", "unverified", "pending"];
// Shareable path that starts with the verdict, e.g. /false/sacks-20260703-10
const pathOf = r => `/${String(r.verdict || "claim").toLowerCase()}/${String(r.speaker || "").trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, "")}-${r.id.slice(4)}`;
const idFromSlug = s => { const m = String(s || "").match(/(\d{8}-\d{2,3})$/); return m ? "AIA-" + m[1] : ""; };

module.exports = { loadRows, originOf, esc, fmtDate, hostOf, ID_RE, VERDICT_SLUGS, pathOf, idFromSlug };
