# Cloudflare Setup

This project is now prepared for Cloudflare Pages + Functions.

Relevant files:

- `public/` for static pages
- `functions/api/dashboard.js` for the live JSON feed
- `functions/api/health.js` for a health endpoint
- `wrangler.toml` for local/project config

## Best deployment path

Use a GitHub-connected Cloudflare Pages project.

Direct static upload is not the best option here because this project now uses Cloudflare Functions for `/api/dashboard`.

## 1. Put the project in GitHub

From the project folder:

```bash
cd "/Users/brendongrainger/Documents/Fuel Watch"
git init
git add .
git commit -m "Initial fuel watch live app"
```

Then create a GitHub repo and push it.

## 2. Create the Pages project

In the Cloudflare Pages screen you showed:

1. Click `Connect GitHub`
2. Authorize GitHub if asked
3. Select the repo for this project
4. In build settings use:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `public`
- Root directory: leave blank unless you move the repo later

Cloudflare should detect `functions/` automatically.

## 3. Deploy

Click `Save and Deploy`.

After deployment, test:

- `/`
- `/countdown.html`
- `/ticker.html`
- `/api/dashboard`
- `/api/health`

## 4. Use these hosted URLs in your streaming tools

Examples:

- Full page: `https://your-project.pages.dev/?stream=1`
- Countdown page: `https://your-project.pages.dev/countdown.html`
- Lower third ticker: `https://your-project.pages.dev/ticker.html`

## 5. Recommended use in a second streaming app

If you use PRISM Live Studio for the fuel stream:

- add a `Browser Capture` source pointed at `countdown.html`
- or use `Window Capture` on a dedicated browser window showing the hosted page
- add mic/audio separately inside PRISM

## 6. Before going public

Edit branding in `functions/api/dashboard.js`:

- `channelName`
- `supportText`
- `supportUrl`
- disclaimer text

## 7. Fast rollback

If a deploy breaks the feed, Cloudflare Pages lets you roll back to an earlier deployment from the dashboard.
