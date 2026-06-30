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

function pickRandomQuote(rows) {
  let quote;

  do {
    quote = rows[Math.floor(Math.random() * rows.length)];
  } while (
    quote.message.startsWith("!") ||
    quote.message.length < 6
  );

  return `"${quote.message}"`;
}

function getRandomQuote(files) {
  const rows = files.flatMap(loadRows);
  return pickRandomQuote(rows);
}

function sendQuote(res, files) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  try {
    res.type("text/plain");
    res.send(getRandomQuote(files));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error getting quote");
  }
}

app.get("/", (req, res) => {
  res.type("text/plain");
  res.send("Finn quote API is running.");
});

// Random quote from the magical limes database.
app.get("/magicallimes/random", (req, res) => {
  sendQuote(res, [DATABASES.magicallimes]);
});

// Random quote from the green beans database.
app.get("/greenbean/random", (req, res) => {
  sendQuote(res, [DATABASES.greenbean]);
});

// Random quote from both databases combined.
app.get("/random", (req, res) => {
  sendQuote(res, [DATABASES.magicallimes, DATABASES.greenbean]);
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Finn quote API running on port ${port}`);
});
