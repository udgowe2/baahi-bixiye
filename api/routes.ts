import { Router } from "express";
import { pool } from "./db.js";
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import axios from "axios";
import * as cheerio from "cheerio";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({ storage: storage });

export const apiRouter = Router();

const ai = new GoogleGenAI({ apiKey: "AIzaSyCbA172g2YxLpkWkG6XJAss7SwECF0ZWj0" });

// Get all recipes
apiRouter.get("/recipes", async (req, res) => {
    try {
        const [rows]: any = await pool.query("SELECT * FROM recipes ORDER BY createdAt DESC");
        res.json(rows.map((r: any) => ({
            ...r,
            ingredients: JSON.parse(r.ingredients || "[]"),
            tags: JSON.parse(r.tags || "[]")
        })));
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Add/Update recipe
apiRouter.post("/recipes", async (req, res) => {
    try {
        const { id, title, image, prepTime, mealTime, category, ingredients, instructions, tags, sourceUrl } = req.body;
        await pool.query(`
      REPLACE INTO recipes (id, title, image, prepTime, mealTime, category, ingredients, instructions, tags, sourceUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, title, image, prepTime, mealTime || null, category || null, JSON.stringify(ingredients), instructions, JSON.stringify(tags), sourceUrl]);
        res.json({ success: true });
    } catch (error: any) {
        console.error("[Database Error] Recipe save failed:", error.message || error);
        console.error("[Database Error] Payload was:", req.body);
        res.status(500).json({ error: "Database error: " + (error.message || "Unknown error") });
    }
});

// Upload image
apiRouter.post("/upload-image", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// Delete recipe
apiRouter.delete("/recipes/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM recipes WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Get planner
apiRouter.get("/planner", async (req, res) => {
    try {
        const [plannerRows]: any = await pool.query("SELECT * FROM planner ORDER BY dayIndex ASC");
        const [recipeRows]: any = await pool.query("SELECT * FROM recipes");

        const recipeMap = new Map(recipeRows.map((r: any) => [r.id, {
            ...r,
            ingredients: JSON.parse(r.ingredients || "[]"),
            tags: JSON.parse(r.tags || "[]")
        }]));

        res.json(plannerRows.map((p: any) => {
            const recipeIds = JSON.parse(p.recipeIds || "[]");
            return {
                ...p,
                recipeIds,
                recipes: recipeIds.map((id: string) => recipeMap.get(id)).filter(Boolean)
            };
        }));
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Update planner slot
apiRouter.post("/planner", async (req, res) => {
    try {
        const { dayIndex, mealType, recipeIds, helperName } = req.body;
        const id = `day-${dayIndex}-${mealType}`;
        await pool.query(`
      REPLACE INTO planner (id, dayIndex, mealType, recipeIds, helperName)
      VALUES (?, ?, ?, ?, ?)
    `, [id, dayIndex, mealType, JSON.stringify(recipeIds), helperName]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Get manual shopping items
apiRouter.get("/shopping", async (req, res) => {
    try {
        const [rows]: any = await pool.query("SELECT * FROM shopping_list");
        res.json(rows.map((i: any) => ({ ...i, isCompleted: !!i.isCompleted })));
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Add manual shopping item
apiRouter.post("/shopping", async (req, res) => {
    try {
        const { id, name, amount, isCompleted } = req.body;
        await pool.query(`
      REPLACE INTO shopping_list (id, name, amount, isCompleted)
      VALUES (?, ?, ?, ?)
    `, [id, name, amount, isCompleted ? 1 : 0]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Toggle/Update shopping item
apiRouter.patch("/shopping/:id", async (req, res) => {
    try {
        const { isCompleted } = req.body;
        await pool.query("UPDATE shopping_list SET isCompleted = ? WHERE id = ?", [isCompleted ? 1 : 0, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Delete shopping item
apiRouter.delete("/shopping/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM shopping_list WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// --- Daily Tasks Routes ---

// Get tasks for a specific date
apiRouter.get("/tasks", async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Date parameter is required" });
        
        const [rows]: any = await pool.query(
            "SELECT * FROM daily_tasks WHERE dateStr = ? ORDER BY isCompleted ASC, isSmartTask DESC", 
            [date]
        );
        res.json(rows.map((t: any) => ({ ...t, isCompleted: !!t.isCompleted, isSmartTask: !!t.isSmartTask })));
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Add/Update a task
apiRouter.post("/tasks", async (req, res) => {
    try {
        const { id, dateStr, text, isCompleted, isSmartTask } = req.body;
        await pool.query(`
      REPLACE INTO daily_tasks (id, dateStr, text, isCompleted, isSmartTask)
      VALUES (?, ?, ?, ?, ?)
    `, [id, dateStr, text, isCompleted ? 1 : 0, isSmartTask ? 1 : 0]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Update task completion status
apiRouter.patch("/tasks/:id", async (req, res) => {
    try {
        const { isCompleted } = req.body;
        await pool.query("UPDATE daily_tasks SET isCompleted = ? WHERE id = ?", [isCompleted ? 1 : 0, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Delete task
apiRouter.delete("/tasks/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM daily_tasks WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Bulk insert smart tasks (only if they don't already exist for this date)
apiRouter.post("/tasks/smart-sync", async (req, res) => {
    try {
        const { dateStr, tasks } = req.body;
        if (!dateStr || !Array.isArray(tasks)) return res.status(400).json({ error: "Invalid payload" });

        // Insert using INSERT IGNORE to avoid overwriting modified tasks if ids match, 
        // though normally the frontend handles deduplication before calling this.
        for (const task of tasks) {
              await pool.query(`
                INSERT IGNORE INTO daily_tasks (id, dateStr, text, isCompleted, isSmartTask)
                VALUES (?, ?, ?, 0, 1)
            `, [task.id, dateStr, task.text]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Bulk delete obsolete smart tasks
apiRouter.post("/tasks/smart-sync-cleanup", async (req, res) => {
    try {
        const { taskIds } = req.body;
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
             return res.json({ success: true }); 
        }

        const placeholders = taskIds.map(() => '?').join(',');
        await pool.query(`DELETE FROM daily_tasks WHERE id IN (${placeholders})`, taskIds);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// AI Recipe Generator
apiRouter.post("/generate-recipe", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
        console.log(`[API Generate] Generating recipe for prompt: ${prompt}`);

        const geminiPrompt = `
You are a skilled family cook and nutrition advisor. Create a recipe based on this user request:
"${prompt}"

IMPORTANT: Detect the language of the user's request above and write the ENTIRE recipe (title, instructions, ingredient names, tags) in THAT SAME LANGUAGE.
- If the user writes in English → respond in English
- If the user writes in Somali (Af-Soomaali) → respond in Somali
- If the user writes in German → respond in German
- For any other language → respond in that language

Rules:
1. Respond with RAW JSON only, no other text.
2. Normalize ingredient names clearly (e.g. "red pepper" not "pepper, red").
3. Basic pantry items (salt, pepper, oil, flour, sugar, water, spices) MUST have isPantry: true.
4. Instructions MUST use Markdown format with numbered steps.
5. Give short descriptive tags (e.g. "Quick", "Kid-Friendly", "Vegetarian").
6. Provide "englishSearchTerm" describing the dish in English (for image lookup), e.g. "chicken rice plate".
7. Set mealTime: "breakfast", "lunch", "dinner" or "snack".
8. Set category: "komplett", "gemuese", "fleisch" or "staerke".

🚫 STRICT HALAL RULES (always apply regardless of language):
- NEVER include: alcohol, pork, lard, pork gelatin, or any haram ingredients.
- All meat must be Halal (islamically slaughtered).
- If the request contains a haram ingredient, substitute a halal equivalent.
`;


        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: geminiPrompt,
            config: {
                systemInstruction: "You are a multilingual family recipe generator for a Muslim family. STRICT HALAL RULES: Never include alcohol, pork, lard, or any haram ingredients. All recipes must be 100% halal. Always respond with valid JSON matching the exact schema provided. Never wrap in markdown blocks, just raw JSON. IMPORTANT: Detect the language the user wrote in and respond in that same language throughout (title, ingredients, instructions, tags) — except the englishSearchTerm which must always be in English.",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        image: { type: Type.STRING, nullable: true },
                        prepTime: { type: Type.STRING, nullable: true },
                        ingredients: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, nullable: true },
                                    amount: { type: Type.STRING, nullable: true },
                                    isPantry: { type: Type.BOOLEAN, nullable: true }
                                },
                                required: ["name", "amount", "isPantry"]
                            },
                            nullable: true
                        },
                        instructions: { type: Type.STRING, nullable: true },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING, nullable: true }, nullable: true },
                        englishSearchTerm: { type: Type.STRING, nullable: true },
                        mealTime: { type: Type.STRING, nullable: true },
                        category: { type: Type.STRING, nullable: true }
                    },
                    required: ["title"]
                }
            }
        });

        console.log("[API Generate] Received raw Gemini response.");

        const recipeData = JSON.parse(aiResponse.text || "{}");
        recipeData.id = `ai-${Math.random().toString(36).substring(2, 11)}`;
        
        // Dynamically assign an image from Unsplash based on the AI's search term
        if (recipeData.englishSearchTerm) {
            const query = encodeURIComponent(recipeData.englishSearchTerm);
            recipeData.image = `https://source.unsplash.com/800x600/?${query},food`;
        } else if (!recipeData.image || !recipeData.image.startsWith("http")) {
             recipeData.image = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=800";
        }

        console.log("[API Generate] Sending generated recipe back to frontend.");

        res.json(recipeData);
    } catch (error: any) {
        console.error("Generation error:", error);
        res.status(500).json({ error: "Failed to generate recipe: " + error.message });
    }
});

// Image Upload Endpoint
apiRouter.post("/upload-image", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
    }
    // Return relative url accessible from public folder
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});
