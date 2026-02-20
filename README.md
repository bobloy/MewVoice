# MewVoice

**Create, share, and install custom cat voice packs for [Mewgenics](https://store.steampowered.com/app/2459200/Mewgenics/).**

[**mewvoice.com**](https://mewvoice.com) &nbsp;|&nbsp; [GitHub Releases](https://github.com/bobloy/MewVoice/releases) &nbsp;|&nbsp; [NexusMods](https://www.nexusmods.com/mewgenics/mods/76)

---

## What is MewVoice?

MewVoice is a community toolset for creating and managing custom cat voice packs for Mewgenics. It consists of three parts:

- **Web app** ([mewvoice.com](https://mewvoice.com)) — record or upload audio clips, build voice packs in the browser, and browse the community library
- **Desktop app** — install and manage voice packs locally, compatible with the [Mewtator](https://www.nexusmods.com/mewgenics/mods/76/mods/1) mod loader
- **Cloudflare Worker API** — backend for the community library (pack storage and hosting)

## Getting Started (End Users)

1. Go to [mewvoice.com](https://mewvoice.com) to build a voice pack or download one from the community library
2. Install the [MewVoice Desktop app](https://github.com/bobloy/MewVoice/releases/latest) — also available on [NexusMods](https://www.nexusmods.com/mewgenics/mods/76)
3. Install [Mewtator](https://www.nexusmods.com/mewgenics/mods/76/mods/1) if you haven't already
4. Import your ZIP into the desktop app and launch the game

## Development

### Prerequisites
- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for the worker)
- [Rust + Tauri CLI](https://tauri.app/start/prerequisites/) (for the desktop app)

### Web client
```bash
cd client
npm install
npm run dev
```

### Cloudflare Worker
```bash
cd worker
npm install
npx wrangler dev
```

### Desktop app
```bash
cd desktop
npm install
npm run dev
```

## Architecture

| Directory | Purpose |
|-----------|---------|
| `client/` | React + Vite web app |
| `worker/` | Cloudflare Workers API (Hono + R2 + D1) |
| `desktop/` | Tauri desktop app |
| `unpacked/` | Extracted game assets for reference (not shipped) |

## Distribution

The desktop app is released via [GitHub Releases](https://github.com/bobloy/MewVoice/releases) and [NexusMods](https://www.nexusmods.com/mewgenics/mods/76). The web app and API are deployed to Cloudflare.
