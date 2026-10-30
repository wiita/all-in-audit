// "What the markets say": live odds from Kalshi, Polymarket and PredictIt for open predictions
// that have a similar market (mapping in data/markets.json). Plain links, no referral codes.
const MAP = require("../data/markets.json");
const { esc } = require("./_data");

const TTL = 5 * 60 * 1000;
const cache = new Map();
const NAMES = { kalshi: "Kalshi", polymarket: "Polymarket", predictit: "PredictIt" };

async function getJSON(url) {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "allin.fan (market odds)" }, signal: AbortSignal.timeout(2500) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
const num = x => { const n = parseFloat(x); return Number.isFinite(n) ? n : null; };

// Returns { p: probability of the market's Yes (0-1), url, q } or null.
async function price(line) {
  const key = JSON.stringify(line);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  let v = null;
  try {
    if (line.venue === "kalshi") {
      const m = (await getJSON(`https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(line.ticker)}`)).market || {};
      if (m.status === "active" || m.status === "open") {
        const bid = num(m.yes_bid_dollars), ask = num(m.yes_ask_dollars), last = num(m.last_price_dollars);
        const p = bid > 0 && ask > 0 && ask - bid <= 0.1 ? (bid + ask) / 2 : last;
        if (p != null) v = { p, url: `https://kalshi.com/markets/${line.ticker.split("-")[0].toLowerCase()}`, q: line.q || m.title };
      }
    } else if (line.venue === "polymarket") {
      const m = (await getJSON(`https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(line.slug)}`))[0];
      if (m && !m.closed) {
        const prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices;
        const p = num((prices || [])[0]);
        const ev = (m.events && m.events[0] && m.events[0].slug) || line.slug;
        if (p != null) v = { p, url: `https://polymarket.com/event/${ev}`, q: line.q || m.question };
      }
    } else if (line.venue === "predictit") {
      const m = await getJSON(`https://www.predictit.org/api/marketdata/markets/${line.market}`);
      const c = (m.contracts || []).find(x => x.id === line.contract);
      if (c && c.status !== "Closed") {
        const p = num(c.lastTradePrice);
        if (p != null) v = { p, url: m.url || `https://www.predictit.org/markets/detail/${line.market}`, q: line.q || `${m.shortName || m.name}: ${c.name}` };
      }
    }
  } catch (e) { v = hit ? hit.v : null; }
  cache.set(key, { t: Date.now(), v });
  return v;
}

const pctText = p => { const n = Math.round(p * 100); return n < 1 ? "<1%" : n > 99 ? ">99%" : n + "%"; };

// HTML for the claim page, or "" when there is no matching market or no venue answered.
async function marketsBox(r) {
  if (!r || r.type !== "Prediction" || r.verdict !== "Pending") return "";
  const c = MAP.claims[r.id];
  const set = c && MAP.sets[c.set];
  if (!set) return "";
  const got = await Promise.all(set.lines.map(l => price(l).then(v => v && { ...v, venue: l.venue })));
  const rows = got.filter(Boolean);
  if (!rows.length) return "";
  const host = String(r.speaker || "").split(/\s+/).pop();
  const li = rows.map(x => {
    const p = c.side === "no" ? 1 - x.p : x.p;
    const w = Math.max(2, Math.round(p * 100));
    return `<li><a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${NAMES[x.venue]}</a><span class="mk-bar" aria-hidden="true"><span style="width:${w}%"></span></span><b>${pctText(p)}</b></li>`;
  }).join("");
  return `
    <section class="markets" aria-labelledby="mk-h">
      <div class="mk-head"><h2 id="mk-h">What the markets say</h2><span>Chance ${esc(host)}'s call comes true</span></div>
      <ul>${li}</ul>
      <p class="mk-q">Market: ${esc(set.label)}${c.side === "no" ? " (his call needs No)" : ""}. ${c.fit === "same" ? "Same question as our scoring rule." : esc(c.gap || "Nearest market, not an exact match.")}</p>
      <p class="mk-fine">Live prices, refreshed every few minutes. Market odds are not part of our verdict. Plain links: we have no referral deal with any of these venues and earn nothing from them. Some venues are not available in every country.</p>
    </section>`;
}

module.exports = { marketsBox };
