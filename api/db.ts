import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "baahi",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "Baahi",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export let pool: mysql.Pool;

// Im Docker-Compose-Setup braucht MariaDB beim ersten Start länger als die App
async function waitForDb(retries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
      });
      await connection.end();
      return;
    } catch (err: any) {
      if (attempt === retries) throw err;
      console.log(`Warte auf Datenbank (${attempt}/${retries})...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

export async function initDb() {
  if (!dbConfig.password) {
    throw new Error("DB_PASSWORD ist nicht gesetzt. Bitte .env bzw. Container-Umgebungsvariablen prüfen.");
  }

  await waitForDb();

  try {
    // Datenbank anlegen, falls der User die Rechte dazu hat (im Compose-Setup
    // legt MariaDB sie selbst an und der App-User darf kein CREATE DATABASE)
    try {
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
      await connection.end();
    } catch {
      console.log(`Nutze vorhandene Datenbank "${dbConfig.database}"`);
    }

    pool = mysql.createPool(dbConfig as mysql.PoolOptions);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        image TEXT,
        prepTime VARCHAR(50),
        mealTime VARCHAR(50),
        category VARCHAR(50),
        ingredients LONGTEXT, -- JSON array of { name: string, amount: string, isPantry: boolean }
        instructions LONGTEXT,
        tags LONGTEXT, -- JSON array of strings
        sourceUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS planner (
        id VARCHAR(255) PRIMARY KEY,
        dayIndex INT NOT NULL, -- 0 (Mon) to 6 (Sun)
        dateStr VARCHAR(10), -- e.g. 2023-11-06
        mealType VARCHAR(50) NOT NULL, -- breakfast, lunch, dinner, snack
        recipeIds LONGTEXT, -- JSON array of recipe IDs
        helperName VARCHAR(255)
      )
    `);
    
    // Safely add dateStr column if the table was already created in an older version
    try {
      await pool.query('ALTER TABLE planner ADD COLUMN dateStr VARCHAR(10)');
    } catch (e: any) {
      // Ignore error if column already exists (ER_DUP_FIELDNAME)
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn("Notice: " + e.message);
      }
    }

    // Auto-migrate old NULL dateStr rows to the current week
    try {
        const [rows]: any = await pool.query('SELECT * FROM planner WHERE dateStr IS NULL');
        if (rows && rows.length > 0) {
            console.log(`Found ${rows.length} legacy planner rows. Migrating to current week...`);
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            d.setHours(0, 0, 0, 0);

            for (const row of rows) {
                const rowDate = new Date(d);
                rowDate.setDate(rowDate.getDate() + row.dayIndex);
                const dateStr = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}-${String(rowDate.getDate()).padStart(2, '0')}`;
                const newId = `${dateStr}-${row.mealType}`;
                
                try {
                    await pool.query('UPDATE planner SET dateStr = ?, id = ? WHERE id = ?', [dateStr, newId, row.id]);
                } catch (updateErr: any) {
                    await pool.query('DELETE FROM planner WHERE id = ?', [row.id]);
                }
            }
        }
    } catch (migrationErr: any) {
        console.warn("Migration notice:", migrationErr.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_list (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        amount VARCHAR(255),
        isCompleted TINYINT(1) DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id VARCHAR(255) PRIMARY KEY,
        dateStr VARCHAR(10) NOT NULL,
        text VARCHAR(500) NOT NULL,
        isCompleted TINYINT(1) DEFAULT 0,
        isSmartTask TINYINT(1) DEFAULT 0
      )
    `);

    console.log("MySQL Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MySQL Database:", error);
    throw error;
  }
}
