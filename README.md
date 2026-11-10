# SHAN UNCENSORED AI

Telegram AI assistant powered by a local Ollama model.

## Features
- Sinhala/English chat with Sinhala Pro mode
- AI Developer, Python, Code Debugger, and defensive Security modes
- Persistent conversation history stored locally in `data/store.json`
- Text/code file analyzer for TXT, MD, JS, PY, JSON, HTML, CSS, CSV, XML, YAML, LOG, SQL, and SH files (150 KB limit)
- Web search using DuckDuckGo HTML results via `/search query`
- Admin statistics dashboard via `/admin` (restricted to configured Telegram user IDs)
- `/myid`, `/memory`, `/forget`, `/clear`, `/status`, `/mode`, and `/help`

## Requirements
- Ubuntu VPS, Node.js 20+, npm, PM2
- Ollama running on localhost and a pulled model
- Telegram bot token

## Setup
```bash
cd /opt/Ai_bot
npm install
cp .env.example .env
nano .env
```
Set `BOT_TOKEN`, `AI_MODEL`, and `ADMIN_USER_IDS`. Get your Telegram numeric ID by sending `/myid` to the bot after the first start. Put that ID into `ADMIN_USER_IDS` and restart.

## Run
```bash
pm2 restart shan-uncensored-ai --update-env
```
For a first-time install:
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

## Commands
- `/start` - Main menu
- `/mode` - Choose AI mode
- `/search your query` - Search the web and summarize results
- `/memory` - View saved history count
- `/forget` - Delete your saved conversation history
- `/clear` - Clear conversation history
- `/myid` - Show Telegram user ID
- `/status` - Check Ollama
- `/admin` - Admin-only usage dashboard

## Data and privacy
Conversation history and aggregate usage statistics are stored in `data/store.json` on the VPS. Back up this file if you need to preserve memory across VPS migrations. Use `/forget` to delete your own saved conversation history. Restrict VPS file access and keep backups private. Do not upload `.env` or Telegram tokens to GitHub.

## Limitations
- File analysis currently supports text/code files only, up to 150 KB. It does not execute uploaded code.
- Web search depends on DuckDuckGo's public HTML results and may fail or be rate-limited; search results should be verified from their original sources.
- A local 3B model on CPU may take longer for large code outputs. Three-second replies cannot be guaranteed.
- Admin dashboard is a Telegram command-based statistics view, not a separate web panel.
- Security features are intended for defensive and authorized use only.
