# SHAN UNCENSORED AI

Telegram AI assistant powered by a local Ollama model running on your VPS.

## Features

- Sinhala and English conversations
- Ollama local model support
- Chat, Coding, Python and Cybersecurity learning modes
- Inline Telegram buttons
- Per-user in-memory conversation history
- /start, /help, /mode, /clear and /status commands
- PM2 process configuration

## Requirements

- Ubuntu VPS
- Node.js 20+
- Ollama installed
- Telegram bot token from [@BotFather](https://t.me/BotFather)

## Install Ollama model

```bash
ollama pull qwen2.5:3b
```

Keep Ollama listening on 127.0.0.1. Do not expose port 11434 publicly.

## Install the Telegram bot

```bash
cd /opt
git clone https://github.com/Hirushan1234567/Ai_bot.git
cd Ai_bot
npm install
cp .env.example .env
nano .env
```

Set your real Telegram token in the private `.env` file:

```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
OLLAMA_URL=http://127.0.0.1:11434
AI_MODEL=qwen2.5:3b
MAX_HISTORY=12
```

Never upload `.env` or your bot token to GitHub.

## Run with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

If `pm2 startup` prints a command, run that command as instructed.

## Commands

- `/start` - Start the bot and show the menu
- `/help` - Show help
- `/mode` - Choose an AI mode
- `/clear` - Clear the current conversation history
- `/status` - Check Ollama and model availability

## Notes

- Conversation history is stored in memory and resets when the bot restarts.
- Performance depends on VPS CPU/RAM and Telegram limits; it is not literally unlimited.
- Cybersecurity mode supports defensive learning and authorized testing.
