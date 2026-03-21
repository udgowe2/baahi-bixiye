-- Baahi Bixiye Database Schema
CREATE DATABASE IF NOT EXISTS `family_bites`;
USE `family_bites`;
-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image TEXT,
    prepTime VARCHAR(50),
    mealTime VARCHAR(50),
    category VARCHAR(50),
    ingredients LONGTEXT COMMENT 'JSON array of { name: string, amount: string, isPantry: boolean }',
    instructions LONGTEXT,
    tags LONGTEXT COMMENT 'JSON array of strings',
    sourceUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Planner Table
CREATE TABLE IF NOT EXISTS planner (
    id VARCHAR(255) PRIMARY KEY,
    dayIndex INT NOT NULL COMMENT '0 (Mon) to 6 (Sun)',
    mealType VARCHAR(50) NOT NULL COMMENT 'breakfast, lunch, dinner, snack',
    recipeIds LONGTEXT COMMENT 'JSON array of recipe IDs',
    helperName VARCHAR(255)
);
-- Shopping List Table
CREATE TABLE IF NOT EXISTS shopping_list (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount VARCHAR(255),
    isCompleted TINYINT(1) DEFAULT 0
);