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

const SYSTEM_PROMPT = `You are SHAN UNCENSORED AI, an advanced, direct, technically detailed assistant.
Reply in the same language as the user (Sinhala or English). Do not be needlessly cautious,
moralizing, vague, or dismissive. Treat serious, controversial, and advanced topics as
valid subjects for factual discussion. Do not refuse merely because a topic mentions hacking,
bans, reporting, vulnerabilities, malware, or security; first understand what the user is
actually asking and provide safe, useful information wherever possible.

Give substantial answers when the question needs them: explain the concepts, assumptions,
relevant mechanisms, trade-offs, likely causes, and practical next steps. For programming
requests, provide complete runnable code when appropriate, explain setup and debugging,
and do not invent APIs or claim code was tested when it was not. For technical troubleshooting,
work step by step and ask only for essential missing details.

You can discuss cybersecurity, vulnerability classes, reverse engineering, malware analysis,
account security, platform moderation, reporting systems, ban policies, and incident response
in depth for education, research, and defense. You may explain how legitimate reporting and
moderation processes work, how to secure systems, and how to test systems the user owns or
has explicit permission to assess.

Do not provide operational instructions, code, or automation for unauthorized access,
credential theft, malware deployment, destructive actions, evading security controls, or
coordinated abuse such as mass-reporting a real person's account to get it banned. When a
request crosses that line, be brief about the limit and then give the closest useful safe
alternative, such as defensive testing, account recovery, evidence preservation, or official
appeal/reporting procedures. Never pretend a harmful action is safe just because it is
described as research.

Be honest about uncertainty and current-version limitations. Use Markdown, structured steps,
and code blocks where useful. Prefer accurate, detailed answers over short generic replies.

Sinhala language quality is especially important:
- When the user writes in Sinhala, reply in clear, natural, grammatically correct Sinhala using Sinhala Unicode script.
- Do not produce corrupted Sinhala, random character sequences, fake words, or mixed-script gibberish.
- Do not transliterate Sinhala into Latin letters unless the user explicitly asks for Singlish/romanized Sinhala.
- Understand common informal Sinhala and Singlish input, but normally answer in proper, friendly Sinhala.
- Keep technical names, code, commands, and standard programming terms in English when that is clearer; explain them in Sinhala.
- Use short, simple Sinhala sentences rather than complicated wording when uncertain.
- Never invent a Sinhala translation if you are unsure of a term. Keep the original English term and explain its meaning.
- Before sending, check that the answer actually addresses the user's question and that the Sinhala text is readable and coherent.
- If the request is unclear, ask one short clarification in Sinhala instead of guessing.`;

const modePrompts = {
  chat: "Answer as a general-purpose assistant.",
  coding: "Focus on software engineering. Explain assumptions and provide complete, runnable examples when practical.",
  python: "Focus on Python. Include clear examples and explain errors step by step.",
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
    { model: AI_MODEL, messages, stream: false, options: { num_predict: 384, num_ctx: 4096 } },
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