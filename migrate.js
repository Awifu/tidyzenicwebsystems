require("dotenv").config();
const fs = require("fs");
const mysql = require("mysql2/promise");

(async () => {
  const sql = fs.readFileSync("./schema.sql", "utf8");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true
  });

  try {
    await conn.query(sql);
    console.log("✅ Migration completed.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
