const express = require("express");
const fs = require("fs");
const { parse } = require("csv-parse/sync");

const app = express();

app.get("/", (req, res) => {
  const csv = fs.readFileSync("finn_chat_database.csv", "utf8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true
  });

  const quote = rows[Math.floor(Math.random() * rows.length)];

  res.type("text/plain");
  res.send(`${quote.message} (${quote.date} ${quote.time})`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Finn quote API running on port ${port}`);
});