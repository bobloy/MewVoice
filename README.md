# MewVoice

Community tool for creating and sharing custom cat voice packs for Mewgenics, compatible with the [Mewtator](https://github.com/ShootMe/Mewtator) mod loader.

## Architecture

- `client/` → React + Vite web app (pack builder + community library)
- `worker/` → Cloudflare Workers API (pack storage, library, auth)
- `desktop/` → Tauri desktop app (local pack installation + management)

## Development

### Prerequisites
- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for the worker
- [Rust + Tauri CLI](https://tauri.app/start/prerequisites/) for the desktop app

### Client (web)
```bash
cd client
npm install
npm run dev
```

### Worker (Cloudflare)
```bash
cd worker
npm install
npx wrangler dev
```

### Desktop (Tauri)
```bash
cd desktop
npm install
npm run tauri dev
```

## Distribution

The desktop app is distributed via [GitHub Releases](../../releases). The web client and worker are deployed to Cloudflare.
