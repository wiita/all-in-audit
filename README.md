# The All-In Audit

Source for https://allin.fan, an independent audit of claims and predictions made by the hosts of the All-In Podcast.

Static site deployed on Vercel. Pages read the published "Public" tab of the All-In Audit Data Google Sheet in the browser (only rows with Status = Published), so publishing a row in the sheet updates the site within minutes. `data/snapshot.json` is a fallback used only if the sheet can't be reached.

- `index.html` scorecard, Lean breakdown, predictions and the full claims list
- `game.html` Accurate or False?
- `methodology.html` generated from METHODOLOGY.md in the pipeline repo
- Correction requests: GitHub issues using `.github/ISSUE_TEMPLATE/correction.yml`
