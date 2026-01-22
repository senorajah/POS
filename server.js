// -------------------- SERVER.JS --------------------
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const PORT = 3000;

// Create/open SQLite database
const db = new sqlite3.Database("pos.db");

// -------------------- TABLES & DEFAULT PRODUCTS --------------------
db.serialize(() => {

  // 1️⃣ Products table (name must be unique)
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL
    )
  `);

  // 2️⃣ Sales table
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      sale_date TEXT NOT NULL
    )
  `);

  // 3️⃣ Sale items table
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      product_id INTEGER,
      qty INTEGER,
      price REAL,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // 4️⃣ Insert default products safely
  db.run(`
    INSERT OR IGNORE INTO products (name, price) VALUES
      ('Coffee', 50),
      ('Tea', 40),
      ('Sandwich', 100)
  `);

  console.log("✅ Tables verified and default products inserted!");
});

// -------------------- EXPRESS SETUP --------------------
app.use(express.json()); // Parse JSON
app.use(express.static("public")); // Serve frontend

// -------------------- ROUTES --------------------

// Test route
app.get("/", (req, res) => {
  res.send("POS Backend is running!");
});

// 1️⃣ Get all products
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2️⃣ Create a new sale
app.post("/api/sale", (req, res) => {
  try {
    const { items, total } = req.body;
    const date = new Date().toISOString().split("T")[0]; // current date YYYY-MM-DD

    if (!items || !total || items.length === 0) {
      return res.status(400).json({ error: "Invalid sale data" });
    }

    // Insert into sales table
    db.run(
      `INSERT INTO sales (total, sale_date) VALUES (?, ?)`,
      [total, date],
      function (err) {
        if (err) {
          console.error("Error inserting sale:", err);
          return res.status(500).json({ error: err.message });
        }

        const sale_id = this.lastID;

        // Insert each sale item
        const stmt = db.prepare(
          `INSERT INTO sale_items (sale_id, product_id, qty, price) VALUES (?, ?, ?, ?)`
        );

        for (let item of items) {
          if (!item.product_id || !item.qty || !item.price) continue;
          stmt.run(sale_id, item.product_id, item.qty, item.price, (err) => {
            if (err) console.error("Error inserting sale item:", err);
          });
        }

        stmt.finalize((err) => {
          if (err) console.error("Error finalizing statement:", err);
          res.json({ message: "Sale recorded", sale_id });
        });
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 3️⃣ Get daily report
app.get("/api/report", (req, res) => {
  const date = new Date().toISOString().split("T")[0];

  db.get(
    `SELECT COUNT(id) AS total_sales, SUM(total) AS total_income 
     FROM sales 
     WHERE sale_date = ?`,
    [date],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
