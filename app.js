/* The All-In Audit — shared data loader.
   Reads the published "Public" tab of the All-In Audit Data sheet (only rows with Status = Published).
   Falls back to the bundled snapshot if the sheet can't be reached. */
(function(){
  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQVWAaJsVwxEtcdSEB-dS72P4P7-PdUwfScK7Dloz6oNJ3XuuliI2EYD6mnxCI5SbWBZ5jq_ZqoQutf/pub?gid=961918255&single=true&output=csv";
  const SNAPSHOT_URL = "/data/snapshot.json";
  const HOSTS = ["Chamath Palihapitiya","David Sacks","David Friedberg","Jason Calacanis"];

  function parseCSV(text){
    const rows=[]; let row=[], field="", q=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(q){
        if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; }
        else field+=c;
      } else if(c==='"') q=true;
      else if(c===','){ row.push(field); field=""; }
      else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(field); rows.push(row); row=[]; field=""; }
      else field+=c;
    }
    if(field!==""||row.length){ row.push(field); rows.push(row); }
    const head=rows.shift()||[];
    return rows.filter(r=>r.some(x=>x.trim()!=="")).map(r=>Object.fromEntries(head.map((h,i)=>[h.trim(),(r[i]||"").trim()])));
  }

  function clean(r){
    const sources=(r.Sources||"").split("|").map(s=>s.trim()).filter(s=>/^https?:\/\//.test(s));
    return {
      id:r.ID, status:r.Status, type:r.Type, date:r.Date, episode:r.Episode, title:r.EpisodeTitle, url:r.EpisodeURL,
      ts:r.Timestamp, speaker:r.Speaker, quote:r.Quote, claim:r.Claim, category:r.Category, verdict:r.Verdict,
      evidence:r.Evidence, sources, target:r.TargetDate, next:r.NextReview, notes:r.Notes, lean:r.Lean||"Neutral", auto:r.Auto==="1"
    };
  }

  async function autoRows(){
    try{ const r=await fetch("/data/auto.json",{cache:"no-store"}); return r.ok?((await r.json()).rows||[]):[]; }catch(e){ return []; }
  }
  function merge(rows,auto){ const seen=new Set(rows.map(r=>r.id)); return rows.concat(auto.filter(r=>r.ID&&!seen.has(r.ID)).map(clean)); }

  async function load(){
    const d=await load0(); d.rows=merge(d.rows,await autoRows()); return d;
  }
  async function load0(){
    try{
      const res=await fetch(SHEET_CSV_URL,{cache:"no-store"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const rows=parseCSV(await res.text()).filter(r=>r.ID&&r.Status==="Published").map(clean);
      if(!rows.length) throw new Error("empty");
      return {rows, source:"live"};
    }catch(e){
      const res=await fetch(SNAPSHOT_URL);
      const snap=await res.json();
      return {rows:snap.rows.map(clean), source:"snapshot", asOf:snap.asOf};
    }
  }

  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,"");}catch(e){return u;}};
  const fmtDate=d=>{ if(!/^\d{4}-\d{2}-\d{2}$/.test(d||"")) return d||""; const [y,m,dd]=d.split("-").map(Number); return new Date(Date.UTC(y,m-1,dd)).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}); };
  const RATED=["Accurate","Misleading","False"];

  window.Audit={load, HOSTS, RATED, esc, hostOf, fmtDate};
})();
