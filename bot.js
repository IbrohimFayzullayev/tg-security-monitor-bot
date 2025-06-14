require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

// === 1. Botni ishga tushiramiz ===
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// === 2. Foydalanuvchi uchun ko‘rinadigan “soxta” statistik model ===
let state = {
  totalAttacks: 0,
  lastHourAttacks: 0,
  cpuLoad: 0,
  topIps: [], // [{ip:"192.168.0.13", count:27}, ...]
};

// Har 10 soniyada “hujumlar”ni yangilab turadigan taymer
setInterval(() => {
  const newHits = randInt(5, 30); // tasodifiy urinishlar
  state.totalAttacks += newHits;
  state.lastHourAttacks += newHits;

  // IP statistikasi ― 70 % holatda yangi IP, 30 % holatda mavjudini oshiramiz
  if (Math.random() < 0.7 || state.topIps.length === 0) {
    state.topIps.push({ ip: randomIp(), count: 1 });
  } else {
    const idx = randInt(0, state.topIps.length - 1);
    state.topIps[idx].count += 1;
  }

  // CPU “yuklama”sini tebrantiramiz (0‑100 oralig‘ida)
  state.cpuLoad = Math.min(100, Math.max(0, state.cpuLoad + randInt(-5, 5)));

  // Har 1 soatda lastHourAttacks ni nollash
  if (state.totalAttacks % 3600 <= newHits) state.lastHourAttacks = 0;
}, 10_000);

// === 3. Bot buyruqlari ===
bot.onText(/\/start/, (msg) => {
  const text = `Assalomu alaykum, ${msg.from.first_name || "foydalanuvchi"}! 
Bu bot tarmoq xavfsizligi bo‘yicha **jonli monitoring** ma'lumotlarini ko‘rsatadi. 
Buyruqlar:
/status – Joriy statistikani ko‘rish
/summary – Umumiy hisobot (so‘nggi 1 soat va jami)
/help – Qo‘llanma`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `*Bot buyruqlari*
/status – Hozirgi sekundlardagi holat
/summary – So‘nggi 1 soatda va umuman olganda
/reset – Statistikani nollash (faqat admin uchun)`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, formatStatus(), { parse_mode: "Markdown" });
});

bot.onText(/\/summary/, (msg) => {
  bot.sendMessage(msg.chat.id, formatSummary(), { parse_mode: "Markdown" });
});

// Optional: statistikani tozalash (adminID — o‘zingizni kiriting)
const adminID = 123456789;
bot.onText(/\/reset/, (msg) => {
  if (msg.from.id !== adminID) return;
  state = { totalAttacks: 0, lastHourAttacks: 0, cpuLoad: 0, topIps: [] };
  bot.sendMessage(msg.chat.id, "Statistika tozalandi ✅");
});

// === 4. Yordamchi funksiyalar ===
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIp() {
  return [
    randInt(1, 255),
    randInt(0, 255),
    randInt(0, 255),
    randInt(1, 254),
  ].join(".");
}

function formatStatus() {
  const top5 = state.topIps
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((x, i) => `${i + 1}. \`${x.ip}\`  ⚔️ ${x.count}`)
    .join("\n");
  return `*Joriy holat*
• So‘nggi 10 s → ${state.lastHourAttacks} ta urinish
• CPU yuklama → ${state.cpuLoad}%  
• Eng faol IP lar:  
${top5 || "— Hozircha maʼlumot yo‘q —"}`;
}

function formatSummary() {
  return `*Umumiy hisobot*
• So‘nggi 1 soat: ${state.lastHourAttacks} ta hujum
• Jami: ${state.totalAttacks} ta hujum
• Simulyatsiya boshlangan vaqtdan beri o'tkazilgan monitoring: ${(
    state.totalAttacks / 6
  ).toFixed(1)} daqiqa taxminiy davom etdi.`;
}
