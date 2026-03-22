import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3447"),
  user: "root",
  password: "Welcome25$",
  database: "Baahi",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export let pool: mysql.Pool;

export async function initDb() {
  try {
    // First connect without database to create it if it doesn't exist
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();

    // Now connect with database
    pool = mysql.createPool(dbConfig);

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
        mealType VARCHAR(50) NOT NULL, -- breakfast, lunch, dinner, snack
        recipeIds LONGTEXT, -- JSON array of recipe IDs
        helperName VARCHAR(255)
      )
    `);

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
  }
}
