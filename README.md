# Fuel Watch Live

A dependency-free, stream-friendly Australia and New Zealand fuel reserve comparison dashboard you can run locally and pipe into OBS or a browser source for YouTube.

## What it does

- shows Australia and New Zealand side by side on one page
- fetches official DCCEEW MSO statistics page content for Australia
- includes a New Zealand comparison lane with official-linked fallback context
- links the latest AIP weekly petrol and diesel report pages
- pulls Brent crude and AUD/USD market context
- renders a full-screen dashboard with reserve cards, scenarios, and an official embedded source panel
- saves local snapshots so the dashboard starts building its own history
- includes host notes, a scrolling ticker, and a support/disclaimer strip for stream use

## Run it

```bash
npm start
```

Then open:

```text
http://localhost:8788
```

For a cleaner browser-source layout:

```text
http://localhost:8788/?stream=1
```

## Notes

- The server uses live fetches with fallbacks, so the UI still comes up if a source is temporarily unavailable.
- The scenario cards are illustrative modelling based on the official baseline figures. They are not predictions.
- This is intentionally a clean-room implementation rather than a copy of the referenced site.
- Snapshot history is stored in `data/snapshots.json`.
- Branding defaults live in `server.mjs` under the `BRAND` object.

## Good next upgrades

- wire in vessel feeds or headline alerts
- add an OBS lower-third ticker endpoint
- add your real support URL and channel branding
- add a persistent database instead of a flat JSON snapshot file
