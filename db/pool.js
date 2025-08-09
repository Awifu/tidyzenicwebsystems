// db/pool.js
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,         // e.g. srv1697.hstgr.io
  user: process.env.DB_USER,         // e.g. u927415054_tidyzenic_user
  password: process.env.DB_PASSWORD, // keep in env
  database: process.env.DB_NAME,     // e.g. u927415054_tidyzenic_saas
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // IMPORTANT for running multiple CREATE TABLEs
});

module.exports = pool;
