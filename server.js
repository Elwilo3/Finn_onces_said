const express = require("express");
const fs = require("fs");
const { parse } = require("csv-parse/sync");

const app = express();

function getRandomQuote() {
  const csv = fs.readFileSync("finn_chat_database.csv", "utf8");

  const rows = parse(csv, {
    columns: true
  });

  let quote;

  do {
    quote = rows[Math.floor(Math.random() * rows.length)];
  } while (
    quote.message.startsWith("!") ||
    quote.message.length < 6
  );

  return `"${quote.message}"`;
}

app.get("/", (req, res) => {
  res.type("text/plain");
  res.send("Finn quote API is running.");
});

app.get("/random", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  try {
    res.type("text/plain");
    res.send(getRandomQuote());
  } catch (err) {
    console.error(err);
    res.status(500).send("Error getting quote");
  }
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Finn quote API running on port ${port}`);
});