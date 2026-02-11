# Mewgenics Voice Pack Creator

Community web tool for creating, sharing, and installing custom cat voice packs for Mewgenics.

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
