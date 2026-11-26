// Visitor counting (Vercel Web Analytics, no cookies), with the site owner's own visits left out.
// A browser that opened the site once with ?notrack stays out until it opens ?track.
// /api/skip answers whether this request comes from one of the owner's own addresses.
(function () {
  var KEY = "va-disable";
  try {
    var q = new URLSearchParams(location.search);
    if (q.has("notrack")) localStorage.setItem(KEY, "1");
    if (q.has("track")) localStorage.removeItem(KEY);
    if (localStorage.getItem(KEY)) return;
  } catch (e) { /* storage blocked: go on and ask the server */ }
  function count() {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    var s = document.createElement("script");
    s.defer = true;
    s.src = "/_vercel/insights/script.js";
    document.head.appendChild(s);
  }
  fetch("/api/skip", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (!(j && j.skip)) count(); })
    .catch(count);
})();
