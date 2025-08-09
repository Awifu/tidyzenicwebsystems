// server.js
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MIGRATE_TOKEN = process.env.MIGRATE_TOKEN || ""; // set this in Render
const BASE_DOMAIN = process.env.BASE_DOMAIN || "tidyzenic.com"; // change if needed

app.set("trust proxy", 1);
app.use(express.json());

// ---------------- MySQL pool ----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,         // e.g. srv1697.hstgr.io
  user: process.env.DB_USER,         // e.g. u927415054_tidyzenic_user
  password: process.env.DB_PASSWORD, // keep in env
  database: process.env.DB_NAME,     // e.g. u927415054_tidyzenic_saas
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ---------------- Health routes ----------------
app.get("/healthz", (_req, res) => res.send("ok"));

app.get("/db-health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ db: "up", result: rows[0] });
  } catch (err) {
    console.error("DB health error:", err.message);
    res.status(500).json({ db: "down", error: err.message });
  }
});

// ---------------- One-time HTTP migration ----------------
// Copy/paste your latest CREATE TABLE statements into `schemaSQL` below.
const schemaSQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  plan VARCHAR(64) DEFAULT 'free',
  status ENUM('active','trialing','past_due','canceled','suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS domains (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  hostname VARCHAR(255) NOT NULL UNIQUE,
  is_primary TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(191),
  verified_at DATETIME NULL,
  ssl_status ENUM('none','pending','issued','failed') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX (tenant_id),
  INDEX (hostname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','admin','manager','staff','client') DEFAULT 'owner',
  status ENUM('active','invited','suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tenant_email (tenant_id, email),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX (tenant_id),
  INDEX (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS _schema_lock (
  id TINYINT PRIMARY KEY,
  migrated_at DATETIME
) ENGINE=InnoDB;
`;

app.post("/migrate-once", async (req, res) => {
  try {
    if (!MIGRATE_TOKEN || req.get("x-migrate-token") !== MIGRATE_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // guard: only run once
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _schema_lock (
        id TINYINT PRIMARY KEY,
        migrated_at DATETIME
      ) ENGINE=InnoDB;
    `);
    const [rows] = await pool.query("SELECT * FROM _schema_lock WHERE id=1");
    if (rows.length) return res.json({ status: "skipped", reason: "already migrated" });

    await pool.query(schemaSQL);
    await pool.query("INSERT INTO _schema_lock (id, migrated_at) VALUES (1, NOW())");
    res.json({ status: "ok" });
  } catch (e) {
    console.error("Migration error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ---------------- Tenant resolution middleware ----------------
// Resolves tenant by Host header: subdomain.YourDomain or custom domain in `domains` table.
async function resolveTenant(req, res, next) {
  try {
    const host = (req.headers.host || "").toLowerCase().split(":")[0]; // strip port
    if (!host) return res.status(400).json({ error: "Missing Host header" });

    // Try subdomain of our base domain
    let tenant = null;
    if (host.endsWith("." + BASE_DOMAIN)) {
      const sub = host.slice(0, -1 * ("." + BASE_DOMAIN).length); // e.g. "acme"
      if (sub && sub !== "www") {
        const [t] = await pool.query("SELECT * FROM tenants WHERE slug = ? LIMIT 1", [sub]);
        tenant = t[0] || null;
      }
    }

    // Else try custom domains table
    if (!tenant) {
      const [d] = await pool.query(
        "SELECT tenants.* FROM domains JOIN tenants ON tenants.id = domains.tenant_id WHERE domains.hostname = ? LIMIT 1",
        [host]
      );
      tenant = d[0] || null;
    }

    if (!tenant) {
      req.tenant = null; // public/marketing routes can still work
      return res.status(404).json({ error: "Tenant not found for host", host });
    }

    req.tenant = tenant; // attach for downstream handlers
    next();
  } catch (e) {
    console.error("Tenant resolution error:", e);
    res.status(500).json({ error: "Tenant resolution failed" });
  }
}

// Example protected route that requires a tenant
app.get("/tenant/info", resolveTenant, (req, res) => {
  const t = req.tenant;
  res.json({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    status: t.status,
  });
});

// ---------------- Root route ----------------
app.get("/", (_req, res) => {
  res.send("TidyZenic SaaS (Node) is running. 👋");
});

// ---------------- 404 & error handlers ----------------
app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.path }));
// server.js
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MIGRATE_TOKEN = process.env.MIGRATE_TOKEN || ""; // set this in Render
const BASE_DOMAIN = process.env.BASE_DOMAIN || "tidyzenic.com"; // change if needed

app.set("trust proxy", 1);
app.use(express.json());

// ---------------- MySQL pool ----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,         // e.g. srv1697.hstgr.io
  user: process.env.DB_USER,         // e.g. u927415054_tidyzenic_user
  password: process.env.DB_PASSWORD, // keep in env
  database: process.env.DB_NAME,     // e.g. u927415054_tidyzenic_saas
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ---------------- Health routes ----------------
app.get("/healthz", (_req, res) => res.send("ok"));

app.get("/db-health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ db: "up", result: rows[0] });
  } catch (err) {
    console.error("DB health error:", err.message);
    res.status(500).json({ db: "down", error: err.message });
  }
});

// ---------------- One-time HTTP migration ----------------
// Copy/paste your latest CREATE TABLE statements into `schemaSQL` below.
const schemaSQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  plan VARCHAR(64) DEFAULT 'free',
  status ENUM('active','trialing','past_due','canceled','suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS domains (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  hostname VARCHAR(255) NOT NULL UNIQUE,
  is_primary TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(191),
  verified_at DATETIME NULL,
  ssl_status ENUM('none','pending','issued','failed') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX (tenant_id),
  INDEX (hostname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','admin','manager','staff','client') DEFAULT 'owner',
  status ENUM('active','invited','suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tenant_email (tenant_id, email),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX (tenant_id),
  INDEX (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS _schema_lock (
  id TINYINT PRIMARY KEY,
  migrated_at DATETIME
) ENGINE=InnoDB;
`;

app.post("/migrate-once", async (req, res) => {
  try {
    if (!MIGRATE_TOKEN || req.get("x-migrate-token") !== MIGRATE_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // guard: only run once
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _schema_lock (
        id TINYINT PRIMARY KEY,
        migrated_at DATETIME
      ) ENGINE=InnoDB;
    `);
    const [rows] = await pool.query("SELECT * FROM _schema_lock WHERE id=1");
    if (rows.length) return res.json({ status: "skipped", reason: "already migrated" });

    await pool.query(schemaSQL);
    await pool.query("INSERT INTO _schema_lock (id, migrated_at) VALUES (1, NOW())");
    res.json({ status: "ok" });
  } catch (e) {
    console.error("Migration error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ---------------- Tenant resolution middleware ----------------
// Resolves tenant by Host header: subdomain.YourDomain or custom domain in `domains` table.
async function resolveTenant(req, res, next) {
  try {
    const host = (req.headers.host || "").toLowerCase().split(":")[0]; // strip port
    if (!host) return res.status(400).json({ error: "Missing Host header" });

    // Try subdomain of our base domain
    let tenant = null;
    if (host.endsWith("." + BASE_DOMAIN)) {
      const sub = host.slice(0, -1 * ("." + BASE_DOMAIN).length); // e.g. "acme"
      if (sub && sub !== "www") {
        const [t] = await pool.query("SELECT * FROM tenants WHERE slug = ? LIMIT 1", [sub]);
        tenant = t[0] || null;
      }
    }

    // Else try custom domains table
    if (!tenant) {
      const [d] = await pool.query(
        "SELECT tenants.* FROM domains JOIN tenants ON tenants.id = domains.tenant_id WHERE domains.hostname = ? LIMIT 1",
        [host]
      );
      tenant = d[0] || null;
    }

    if (!tenant) {
      req.tenant = null; // public/marketing routes can still work
      return res.status(404).json({ error: "Tenant not found for host", host });
    }

    req.tenant = tenant; // attach for downstream handlers
    next();
  } catch (e) {
    console.error("Tenant resolution error:", e);
    res.status(500).json({ error: "Tenant resolution failed" });
  }
}

// Example protected route that requires a tenant
app.get("/tenant/info", resolveTenant, (req, res) => {
  const t = req.tenant;
  res.json({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    status: t.status,
  });
});

// ---------------- Root route ----------------
app.get("/", (_req, res) => {
  res.send("TidyZenic SaaS (Node) is running. 👋");
});

// ---------------- 404 & error handlers ----------------
app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.path }));

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ---------------- Graceful shutdown ----------------
const shutdown = async () => {
  try { await pool.end(); } catch {}
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ---------------- Graceful shutdown ----------------
const shutdown = async () => {
  try { await pool.end(); } catch {}
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
