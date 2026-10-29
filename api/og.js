// Share image for one claim (1200x630 PNG), used as the preview when a claim link is posted.
const fs = require("fs");
const path = require("path");
const { loadRows, originOf, fmtDate, ID_RE, idFromSlug } = require("./_data");

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
  if (id === "game") {
    const stamp = (t, c) => h("div", { fontSize: 34, fontWeight: 600, letterSpacing: 4, color: c, border: `4px solid ${c}`, borderRadius: 10, padding: "10px 26px 8px", marginRight: 22 }, t);
    tree = h("div", { width: "100%", height: "100%", background: C.paper, color: C.ink, flexDirection: "column", justifyContent: "center", padding: "80px", fontFamily: "Geist" }, [
      h("div", { fontFamily: "Geist Mono", fontSize: 26, letterSpacing: 3, color: C.False }, "THE ALL-IN AUDIT · GAME"),
      h("div", { fontSize: 88, fontWeight: 600, letterSpacing: -3, marginTop: 20, lineHeight: 1.0 }, "Accurate or False?"),
      h("div", { fontSize: 34, color: C.pencil, marginTop: 22 }, "Ten real quotes from the All-In hosts. Guess the verdict."),
      h("div", { marginTop: 44 }, [stamp("ACCURATE", C.Accurate), stamp("MISLEADING", C.Misleading), stamp("FALSE", C.False)]),
      h("div", { fontSize: 28, color: C.pencil, marginTop: 40 }, "allin.fan/game")
    ]);
  } else if (!r) {
    tree = h("div", { width: "100%", height: "100%", background: C.paper, color: C.ink, flexDirection: "column", justifyContent: "center", padding: "80px", fontFamily: "Geist" }, [
      h("div", { fontFamily: "Geist Mono", fontSize: 26, letterSpacing: 3, color: C.False }, "THE ALL-IN AUDIT"),
      h("div", { fontSize: 72, fontWeight: 600, letterSpacing: -2, marginTop: 24, lineHeight: 1.05 }, "Four besties. Every checkable claim, checked."),
      h("div", { fontSize: 30, color: C.pencil, marginTop: 30 }, "allin.fan")
    ]);
  } else {
    const col = C[r.verdict] || C.ink;
    const q = clip(r.quote, 120);
    const qSize = q.length > 95 ? 56 : q.length > 60 ? 62 : 70;
    tree = h("div", { width: "100%", height: "100%", background: C.sheet, fontFamily: "Geist", color: C.ink }, [
      h("div", { width: 28, height: "100%", background: col }, []),
      h("div", { flex: 1, flexDirection: "column", padding: "56px 72px 60px 64px" }, [
        h("div", { alignItems: "center", justifyContent: "space-between" }, [
          h("div", { background: col, color: "#fff", fontSize: 64, fontWeight: 600, letterSpacing: 6, padding: "10px 30px 6px", borderRadius: 10 }, (r.verdict || "").toUpperCase()),
          h("div", { fontFamily: "Geist Mono", fontSize: 24, letterSpacing: 3, color: C.pencil }, "THE ALL-IN AUDIT")
        ]),
        h("div", { marginTop: 40, fontSize: 40, alignItems: "baseline" }, [
          h("div", { fontWeight: 600, letterSpacing: -1 }, r.speaker),
          h("div", { color: C.pencil, marginLeft: 18, fontSize: 32 }, `on All-In · ${fmtDate(r.date)}${r.verdict === "Pending" && r.target ? ` · due ${fmtDate(r.target)}` : ""}`)
        ]),
        h("div", { marginTop: 26, fontSize: qSize, lineHeight: 1.18, color: "#24354D", letterSpacing: -1, flex: 1 }, `“${q}”`),
        h("div", { justifyContent: "flex-end", fontFamily: "Geist Mono", fontSize: 26, color: C.pencil, letterSpacing: 1 }, "allin.fan")
      ])
    ]);
  }
  const img = new ImageResponse(tree, { width: 1200, height: 630, fonts: FONTS });
  const buf = Buffer.from(await img.arrayBuffer());
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).end(buf);
};
