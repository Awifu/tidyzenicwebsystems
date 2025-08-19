// server.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const pool = require("./db/pool");
const newsletterRoute = require("./routes/newsletter");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MIGRATE_TOKEN = process.env.MIGRATE_TOKEN || "";
const BASE_DOMAIN = process.env.BASE_DOMAIN || "tidyzenic.com";

// Basic config
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json());

// --- Security headers
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  next();
});

// --- Static assets with cache control
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      const isImmutable = /\.(css|js|png|jpe?g|webp|svg|ico)$/.test(filePath);
      res.setHeader(
        "Cache-Control",
        isImmutable ? "public, max-age=31536000, immutable" : "public, max-age=300"
      );
    },
  })
);

// --- Health Checks
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

// --- Newsletter API
app.use("/api/newsletter", newsletterRoute);

// --- Migration schema
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

// --- Dry-run migration
app.post("/migrate-dryrun", async (req, res) => {
  try {
    if (req.get("x-migrate-token") !== MIGRATE_TOKEN)
      return res.status(401).json({ error: "unauthorized" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const statements = schemaSQL.split(";").map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) await conn.query(stmt);
      await conn.rollback();
    } finally {
      conn.release();
    }

    res.json({ status: "dry-run ok", message: "Schema executed and rolled back" });
  } catch (e) {
    console.error("Dry-run migration error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- Idempotent one-time migration
app.post("/migrate-once", async (req, res) => {
  try {
    if (req.get("x-migrate-token") !== MIGRATE_TOKEN)
      return res.status(401).json({ error: "unauthorized" });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS _schema_lock (
        id TINYINT PRIMARY KEY,
        migrated_at DATETIME
      ) ENGINE=InnoDB
    `);

    const [rows] = await pool.query("SELECT 1 FROM _schema_lock WHERE id=1");
    if (rows.length) return res.json({ status: "skipped", reason: "already migrated" });

    await pool.query(schemaSQL);
    await pool.query("INSERT INTO _schema_lock (id, migrated_at) VALUES (1, NOW())");
    res.json({ status: "ok" });
  } catch (e) {
    console.error("Migration error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- Tenant resolution middleware
async function resolveTenant(req, res, next) {
  try {
    const host = (req.headers.host || "").toLowerCase().split(":")[0];
    if (!host) return res.status(400).json({ error: "Missing Host header" });

    let tenant = null;

    if (host.endsWith("." + BASE_DOMAIN)) {
      const subdomain = host.replace("." + BASE_DOMAIN, "");
      if (subdomain && subdomain !== "www") {
        const [t] = await pool.query("SELECT * FROM tenants WHERE slug = ? LIMIT 1", [subdomain]);
        tenant = t[0] || null;
      }
    }

    if (!tenant) {
      const [d] = await pool.query(
        "SELECT tenants.* FROM domains JOIN tenants ON tenants.id = domains.tenant_id WHERE domains.hostname = ? LIMIT 1",
        [host]
      );
      tenant = d[0] || null;
    }

    if (!tenant) return res.status(404).json({ error: "Tenant not found for host", host });

    req.tenant = tenant;
    next();
  } catch (e) {
    console.error("Tenant resolution error:", e);
    res.status(500).json({ error: "Tenant resolution failed" });
  }
}

// --- Public APIs (static for now)
app.get("/api/blog", (_req, res) => {
  res.json([
    { title: "AI Scheduling Arrives", excerpt: "Boost productivity with smart auto-assign.", url: "/blog/ai-scheduling" },
    { title: "Inventory Best Practices", excerpt: "Avoid stockouts & overstock.", url: "/blog/inventory-best-practices" },
    { title: "Client Retention Playbook", excerpt: "Turn one-timers into loyal fans.", url: "/blog/client-retention" }
  ]);
});

app.get("/api/reviews", (_req, res) => {
  res.json([
    { author: "Jane D.", text: "TidyZenic streamlined our entire operation.", rating: 5 },
    { author: "Mark R.", text: "Easy to set up custom domains & branding.", rating: 4 },
    { author: "Lisa P.", text: "AI booking is a game-changer for our staff.", rating: 5 }
  ]);
});

// --- Example tenant route
app.get("/tenant/info", resolveTenant, (req, res) => {
  res.json({
    id: req.tenant.id,
    name: req.tenant.name,
    slug: req.tenant.slug,
    plan: req.tenant.plan,
    status: req.tenant.status,
  });
});

// --- Root index.html
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- 404 + error handler
app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.path }));
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// --- Graceful shutdown
const shutdown = async () => {
  try { await pool.end(); } catch {}
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// --- Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
