// Share image for one claim (1200x630 PNG), used as the preview when a claim link is posted.
const fs = require("fs");
const path = require("path");
const { loadRows, originOf, fmtDate, ID_RE } = require("./_data");

const font = f => fs.readFileSync(path.join(__dirname, "_fonts", f));
let FONTS;
const C = { paper: "#E8ECF0", sheet: "#F6F8FA", ink: "#1B2A41", pencil: "#5E6B7A", soft: "#D5DEE7",
  Accurate: "#1E6B5C", Misleading: "#A35F00", False: "#B3122B", Unverified: "#5E6B7A", Pending: "#2E5B9A" };

const h = (type, style, children) => ({ type, props: { style: { display: "flex", ...style }, children } });
const clip = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

module.exports = async function handler(req, res) {
  const id = String((req.query && req.query.id) || "").trim();
  const { ImageResponse } = await import("@vercel/og");
  FONTS = FONTS || [
    { name: "Geist", data: font("Geist-Regular.ttf"), weight: 400, style: "normal" },
    { name: "Geist", data: font("Geist-Medium.ttf"), weight: 500, style: "normal" },
    { name: "Geist", data: font("Geist-SemiBold.ttf"), weight: 600, style: "normal" },
    { name: "Geist Mono", data: font("GeistMono-Regular.ttf"), weight: 400, style: "normal" }
  ];
  let r = null;
  if (ID_RE.test(id)) r = (await loadRows(originOf(req))).find(x => x.id === id) || null;

  let tree;
  if (!r) {
    tree = h("div", { width: "100%", height: "100%", background: C.paper, color: C.ink, flexDirection: "column", justifyContent: "center", padding: "80px", fontFamily: "Geist" }, [
      h("div", { fontFamily: "Geist Mono", fontSize: 26, letterSpacing: 3, color: C.False }, "THE ALL-IN AUDIT"),
      h("div", { fontSize: 72, fontWeight: 600, letterSpacing: -2, marginTop: 24, lineHeight: 1.05 }, "Four besties. Every checkable claim, checked."),
      h("div", { fontSize: 30, color: C.pencil, marginTop: 30 }, "allin.fan")
    ]);
  } else {
    const col = C[r.verdict] || C.ink;
    const q = clip(r.quote, 190);
    const qSize = q.length > 140 ? 40 : q.length > 90 ? 46 : 54;
    tree = h("div", { width: "100%", height: "100%", background: C.paper, padding: "44px", fontFamily: "Geist", color: C.ink }, [
      h("div", { flex: 1, background: C.sheet, border: `1px solid ${C.soft}`, borderLeft: `14px solid ${col}`, borderRadius: 6, padding: "44px 56px", flexDirection: "column", justifyContent: "space-between" }, [
        h("div", { alignItems: "center", justifyContent: "space-between" }, [
          h("div", { fontSize: 38, fontWeight: 600, letterSpacing: -1 }, r.speaker),
          h("div", { fontSize: 30, fontWeight: 600, letterSpacing: 4, color: col, border: `3px solid ${col}`, borderRadius: 8, padding: "6px 18px 4px" }, (r.verdict || "").toUpperCase())
        ]),
        h("div", { fontSize: qSize, lineHeight: 1.25, color: "#24354D", letterSpacing: -0.5 }, `“${q}”`),
        h("div", { justifyContent: "space-between", alignItems: "center", fontSize: 24, color: C.pencil }, [
          h("div", { fontFamily: "Geist Mono", letterSpacing: 2, color: C.False }, "THE ALL-IN AUDIT · ALLIN.FAN"),
          h("div", {}, `${fmtDate(r.date)} · ${r.id}`)
        ])
      ])
    ]);
  }
  const img = new ImageResponse(tree, { width: 1200, height: 630, fonts: FONTS });
  const buf = Buffer.from(await img.arrayBuffer());
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).end(buf);
};
