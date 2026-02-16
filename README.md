# Mewgenics Voice Pack Creator

Community web tool for creating and sharing custom cat voice packs for Mewgenics, compatible with the [Mewtator](https://github.com/ShootMe/Mewtator) mod loader.
Packs are designed to be installed as a single "Master Mod" for easy management.

## Architecture
- `client/` → React + TypeScript + Vite (port 3000)
- `server/` → Python FastAPI (port 8000)

## Setup

### Prerequisites
- Node.js 18+, Python 3.11+, ffmpeg

### Client
```bash
cd client
npm install
npm run dev
```

### Server
```bash
cd server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Open
http://localhost:3000
