// Tells the page whether to leave this visit out of the visitor counts:
// true when the request comes from one of the addresses in ANALYTICS_EXCLUDE_IPS.
module.exports = (req, res) => {
  const list = (process.env.ANALYTICS_EXCLUDE_IPS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || String(req.headers["x-real-ip"] || "").trim();
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({ skip: !!ip && list.includes(ip) }));
};
