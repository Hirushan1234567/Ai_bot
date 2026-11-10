import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const BOT_TOKEN = process.env.BOT_TOKEN;
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL || "qwen2.5:3b";
const MAX_HISTORY = Number.parseInt(process.env.MAX_HISTORY || "12", 10);
const MAX_MESSAGE_LENGTH = 4000;

if (!BOT_TOKEN) {
  console.error("ERROR: BOT_TOKEN is missing. Add it to your .env file.");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const histories = new Map();
const modes = new Map();

const SYSTEM_PROMPT = `You are SHAN UNCENSORED AI, a practical Sinhala/English assistant and developer.
LANGUAGE:
- If the user writes Sinhala, answer in natural, readable Sinhala Unicode. Never produce gibberish, fake Sinhala words, or random mixed scripts.
- Understand informal Sinhala and Singlish. Use simple, grammatically clear Sinhala. Keep technical terms, code, and commands in English when appropriate.
- If unsure what the user means, ask one short clarification instead of guessing.
GENERAL:
- Understand the user's actual intention. Do not invent a different request or give unrelated lectures.
- For ordinary questions, answer directly and briefly first. Expand only when asked.
- Be honest about uncertainty. Never claim code was tested or deployed unless it actually was.
CODING:
- Act as a capable practical software developer. Help plan, build, debug, and explain real projects.
- For coding requests, provide correct complete runnable code when appropriate, plus required packages, project files, environment variables, setup commands, and test steps.
- Explain simply which directory to use and which commands to run. Use the exact errors and code supplied by the user.
- For broad project ideas, briefly explain a sensible design and ask only the one essential question needed to proceed. Do not just say "I can help".
SAFETY:
- Help with legitimate development, defensive cybersecurity, account security, moderation, and authorized testing.
- Do not provide instructions or automation for unauthorized access, credential theft, malware deployment, destructive actions, evading security controls, harassment, mass reporting, or manipulating bans on other people's accounts. Briefly redirect to a safe, legitimate alternative.
- Do not refuse a topic merely because it mentions hacking, bans, reporting, or security; understand the actual request first.
`;

const modePrompts = {
  chat: "Answer as a general-purpose assistant.",
  coding: "DEVELOPER MODE: Build the requested software. Give complete runnable code and exact setup/run/test commands. State assumptions briefly; do not replace implementation with vague advice.",
  python: "PYTHON DEVELOPER MODE: Provide complete runnable Python code, dependencies, and exact run/test commands. Explain errors simply.",
  security: "Focus on ethical cybersecurity, defensive security, and authorized practice labs only."
};

function keyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💬 Chat", callback_data: "mode:chat" },
        { text: "💻 Coding", callback_data: "mode:coding" }
      ],
      [
        { text: "🐍 Python", callback_data: "mode:python" },
        { text: "🛡️ Cybersecurity", callback_data: "mode:security" }
      ],
      [
        { text: "🧹 Clear chat", callback_data: "clear" },
        { text: "ℹ️ Help", callback_data: "help" }
      ],
      [{ text: "📊 Status", callback_data: "status" }]
    ]
  };
}

function getHistory(userId) {
  if (!histories.has(userId)) histories.set(userId, []);
  return histories.get(userId);
}

async function askOllama(userId, userText) {
  const history = getHistory(userId);
  const mode = modes.get(userId) || "chat";
  const messages = [
    { role: "system", content: SYSTEM_PROMPT + "\n" + modePrompts[mode] },
    ...history,
    { role: "user", content: userText }
  ];

  const response = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: AI_MODEL,
      messages,
      stream: false,
      options: {
        // Keep ordinary replies short for lower latency; allow more tokens for code.
        num_predict: (mode === "coding" || mode === "python" || /code|coding|කෝඩ්|කෝඩින්|හදමු|project|පූර්ණ|සම්පූර්ණ/i.test(userText)) ? 512 : 24,
        num_ctx: 4096
      }
    },
    { timeout: 600000, headers: { "Content-Type": "application/json" } }
  );

  const answer = response.data?.message?.content?.trim();
  if (!answer) throw new Error("Ollama returned an empty response.");

  history.push({ role: "user", content: userText });
  history.push({ role: "assistant", content: answer });
  while (history.length > MAX_HISTORY) history.shift();
  return answer;
}

async function sendLongMessage(chatId, text) {
  const chunks = text.match(/[\s\S]{1,3900}/g) || ["(No response)"];
  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" }).catch(async () => {
      await bot.sendMessage(chatId, chunk);
    });
  }
}

bot.onText(/^\/start(?:@\w+)?$/, async (msg) => {
  modes.set(msg.from.id, "chat");
  await bot.sendMessage(
    msg.chat.id,
    "🤖 *SHAN UNCENSORED AI වෙත සාදරයෙන් පිළිගනිමු!*\n\nමට සාමාන්‍ය දැනුම, අධ්‍යාපනය, JavaScript, Python, coding සහ ආරක්ෂිත cybersecurity ඉගෙනීම ගැන අහන්න.\n\nපහළින් mode එකක් තෝරන්න හෝ කෙළින්ම message එකක් එවන්න.",
    { parse_mode: "Markdown", ...keyboard() }
  );
});

bot.onText(/^\/help(?:@\w+)?$/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "📚 *භාවිතා කරන ආකාරය*\n\n• ප්‍රශ්නයක් කෙළින්ම type කරන්න\n• /mode – AI mode තෝරන්න\n• /clear – chat history මකන්න\n• /status – Bot සහ Ollama status බලන්න\n\nCybersecurity සහාය ලබා දෙන්නේ නීත්‍යානුකූල, අවසර ලත් ඉගෙනීම සහ ආරක්ෂාව සඳහා පමණයි.",
    { parse_mode: "Markdown", ...keyboard() }
  );
});

bot.onText(/^\/mode(?:@\w+)?$/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "ඔයාට අවශ්‍ය mode එක තෝරන්න:", keyboard());
});

bot.onText(/^\/clear(?:@\w+)?$/, async (msg) => {
  histories.delete(msg.from.id);
  await bot.sendMessage(msg.chat.id, "🧹 Chat history එක clear කළා.", keyboard());
});

bot.onText(/^\/status(?:@\w+)?$/, async (msg) => {
  try {
    const r = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 8000 });
    const models = (r.data?.models || []).map((m) => m.name);
    const loaded = models.some((name) => name === AI_MODEL || name.startsWith(AI_MODEL + ":"));
    await bot.sendMessage(
      msg.chat.id,
      `✅ Telegram bot online\n✅ Ollama reachable\n${loaded ? "✅" : "⚠️"} Model: ${AI_MODEL} ${loaded ? "installed" : "not found"}`,
      keyboard()
    );
  } catch {
    await bot.sendMessage(
      msg.chat.id,
      "⚠️ Telegram bot online, නමුත් Ollama server එකට සම්බන්ධ වෙන්න බැහැ. Ollama service එක සහ model එක පරීක්ෂා කරන්න.",
      keyboard()
    );
  }
});

bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat?.id;
  const userId = query.from.id;
  const data = query.data || "";
  await bot.answerCallbackQuery(query.id).catch(() => {});

  if (data.startsWith("mode:")) {
    const mode = data.slice(5);
    if (!modePrompts[mode]) return;
    modes.set(userId, mode);
    await bot.sendMessage(chatId, `✅ Mode changed: ${mode.toUpperCase()}\nදැන් ඔයාගේ ප්‍රශ්නය එවන්න.`);
    return;
  }
  if (data === "clear") {
    histories.delete(userId);
    await bot.sendMessage(chatId, "🧹 Chat history එක clear කළා.");
    return;
  }
  if (data === "help") {
    await bot.sendMessage(chatId, "ප්‍රශ්නයක් type කරන්න. /clear මඟින් history එක clear කරන්න. /status මඟින් AI server එක පරීක්ෂා කරන්න.", keyboard());
    return;
  }
  if (data === "status") {
    try {
      await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 8000 });
      await bot.sendMessage(chatId, `✅ Bot online\n✅ Ollama online\nModel: ${AI_MODEL}`);
    } catch {
      await bot.sendMessage(chatId, "⚠️ Ollama සම්බන්ධතාවය අසාර්ථකයි.");
    }
  }
});

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/") || msg.from?.is_bot) return;
  const text = msg.text.trim();
  if (!text) return;
  if (text.length > MAX_MESSAGE_LENGTH) {
    await bot.sendMessage(msg.chat.id, `Message එක දිග වැඩියි. අකුරු ${MAX_MESSAGE_LENGTH} ට අඩුවෙන් එවන්න.`);
    return;
  }

  const status = await bot.sendMessage(msg.chat.id, "⏳ AI හිතමින් ඉන්නවා...");
  const typing = setInterval(() => {
    bot.sendChatAction(msg.chat.id, "typing").catch(() => {});
  }, 5000);
  try {
    const answer = await askOllama(msg.from.id, text);
    await bot.deleteMessage(msg.chat.id, status.message_id).catch(() => {});
    await sendLongMessage(msg.chat.id, answer);
  } catch (error) {
    console.error("AI request failed:", error.response?.data || error.message);
    await bot.deleteMessage(msg.chat.id, status.message_id).catch(() => {});
    const detail = error.code === "ECONNREFUSED"
      ? "Ollama server එකට සම්බන්ධ වෙන්න බැහැ. Ollama run වෙනවාද සහ OLLAMA_URL හරිද බලන්න."
      : error.code === "ECONNABORTED"
        ? "AI පිළිතුරට විනාඩි 10ක් ගතවුණා. කෙටි ප්‍රශ්නයක් යළි එවන්න."
        : "AI response එක ලබාගන්න බැරි වුණා. Ollama logs පරීක්ෂා කරන්න.";
    await bot.sendMessage(msg.chat.id, `⚠️ ${detail}`);
  } finally {
    clearInterval(typing);
  }
});

bot.on("polling_error", (error) => console.error("Telegram polling error:", error.message));
bot.on("error", (error) => console.error("Telegram bot error:", error.message));

console.log("SHAN UNCENSORED AI Telegram bot is starting...");
console.log(`Ollama: ${OLLAMA_URL} | Model: ${AI_MODEL}`);

process.on("SIGINT", () => bot.stopPolling().finally(() => process.exit(0)));
process.on("SIGTERM", () => bot.stopPolling().finally(() => process.exit(0)));