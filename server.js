const express = require("express");
const fs = require("fs");
const { parse } = require("csv-parse/sync");

const app = express();

const DATABASES = {
  magicallimes: "finn_chat_database_magicallimes.csv",
  greenbean: "finn_chat_database_greenbean.csv"
};

function loadRows(file) {
  const csv = fs.readFileSync(file, "utf8");
  return parse(csv, { columns: true });
}

// Messages we never want to surface: bot commands and tiny one-word noise.
function isUsableMessage(message) {
  return typeof message === "string" &&
    !message.startsWith("!") &&
    message.length >= 6;
}

// How "wild/unhinged" a message reads. Higher = more chaotic energy.
function wildnessScore(message) {
  let score = 0;
  const words = message.split(/\s+/);

  // Swearing / spicy words.
  if (/\b(fuck\w*|shit\w*|bitch|ass|asshole|damn|hell|dick|penis|cum|sex\w*|nasty|piss|crap|horny|kill)\b/i.test(message)) {
    score += 3;
  }

  // ALL CAPS shouting (3+ letter fully-uppercase words).
  const capsWords = words.filter(w => w.length >= 3 && /[A-Z]/.test(w) && w === w.toUpperCase() && !/[a-z]/.test(w));
  score += capsWords.length * 2;

  // Excessive punctuation: !!! or ???
  if (/[!?]{2,}/.test(message)) score += 2;

  // Elongated words: pizzzaaa, kittttiieee (same char 3+ in a row).
  if (/(.)\1\1/.test(message)) score += 2;

  // Emoji.
  score += (message.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;

  // Laughter / chaos markers.
  if (/\b(lmf?ao+|rofl)\b|hahah|ahaha|💀/i.test(message)) score += 1;

  return score;
}

function pickRandomQuote(rows) {
  let quote;

  do {
    quote = rows[Math.floor(Math.random() * rows.length)];
  } while (!isUsableMessage(quote.message));

  return `"${quote.message}"`;
}

// Weighted pick: wilder messages are far more likely, but variety stays.
function pickWildQuote(rows) {
  const candidates = rows
    .filter(r => isUsableMessage(r.message))
    .map(r => ({ message: r.message, score: wildnessScore(r.message) }))
    .filter(c => c.score > 0);

  // Nothing scored as wild — fall back to a normal random quote.
  if (candidates.length === 0) return pickRandomQuote(rows);

  const total = candidates.reduce((sum, c) => sum + c.score, 0);
  let roll = Math.random() * total;
  for (const c of candidates) {
    roll -= c.score;
    if (roll <= 0) return `"${c.message}"`;
  }
  return `"${candidates[candidates.length - 1].message}"`;
}

function getQuote(files, picker) {
  const rows = files.flatMap(loadRows);
  return picker(rows);
}

function sendQuote(res, files, picker = pickRandomQuote) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  try {
    res.type("text/plain");
    res.send(getQuote(files, picker));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error getting quote");
  }
}

// Resolve the request to a list of CSV files.
// No database segment -> all databases combined.
// A database segment -> just that one, or null if it isn't a known database.
function resolveFiles(database) {
  if (!database) return Object.values(DATABASES);
  return DATABASES[database] ? [DATABASES[database]] : null;
}

function unknownDatabaseMessage(name) {
  const valid = Object.keys(DATABASES).join(", ");
  return `Unknown database "${name}". Try one of: ${valid}.`;
}

// Builds a route handler for a given picker (normal vs wild).
// With no :database it serves all databases; with one it narrows to that db.
function quoteHandler(picker) {
  return (req, res) => {
    const files = resolveFiles(req.params.database);
    if (!files) {
      return res.status(404).type("text/plain").send(unknownDatabaseMessage(req.params.database));
    }
    sendQuote(res, files, picker);
  };
}

app.get("/", (req, res) => {
  res.type("text/plain");
  res.send("Finn quote API is running.");
});

// Base: random quote from all databases.
// Filtered: /random/<database> narrows to one, e.g. /random/magicallimes.
app.get("/random", quoteHandler(pickRandomQuote));
app.get("/random/:database", quoteHandler(pickRandomQuote));

// Base: wilder/more unhinged quote from all databases.
// Filtered: /wildrandom/<database> narrows to one, e.g. /wildrandom/greenbean.
app.get("/wildrandom", quoteHandler(pickWildQuote));
app.get("/wildrandom/:database", quoteHandler(pickWildQuote));

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Finn quote API running on port ${port}`);
});
