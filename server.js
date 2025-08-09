const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/healthz", (req, res) => {
  res.send("ok");
});

app.get("/", (req, res) => {
  res.send("TidyZenic SaaS (Node) is running.");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
