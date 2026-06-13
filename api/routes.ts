import { Router } from "express";
import { pool } from "./db.js";
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import multer from "multer";
import path from "path";
import fs from "fs";

// Uploads live outside the image in Docker (volume via UPLOAD_DIR)
export const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
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

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(null, file.mimetype.startsWith("image/"));
    }
});

export const apiRouter = Router();

// Eine korrupte JSON-Spalte darf nicht den ganzen Endpunkt lahmlegen
function safeParse<T>(json: unknown, fallback: T): T {
    try {
        const parsed = JSON.parse(String(json ?? ""));
        return (parsed ?? fallback) as T;
    } catch {
        return fallback;
    }
}

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY ist nicht gesetzt – der Rezept-Generator wird nicht funktionieren.");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- Settings (Vorratsliste, Themen-Tage) ---

apiRouter.get("/settings", async (req, res) => {
    try {
        const [rows]: any = await pool.query("SELECT settingKey, settingValue FROM settings");
        const settings: Record<string, any> = {};
        for (const row of rows) {
            settings[row.settingKey] = safeParse(row.settingValue, null);
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

apiRouter.post("/settings", async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: "key is required" });
        await pool.query(
            "REPLACE INTO settings (settingKey, settingValue) VALUES (?, ?)",
            [key, JSON.stringify(value)]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

async function getPantry(): Promise<string[]> {
    try {
        const [rows]: any = await pool.query("SELECT settingValue FROM settings WHERE settingKey = 'pantry'");
        return rows.length ? safeParse<string[]>(rows[0].settingValue, []) : [];
    } catch {
        return [];
    }
}

// Get all recipes
apiRouter.get("/recipes", async (req, res) => {
    try {
        const [rows]: any = await pool.query("SELECT * FROM recipes ORDER BY createdAt DESC");
        res.json(rows.map((r: any) => ({
            ...r,
            ingredients: safeParse(r.ingredients, []),
            tags: safeParse(r.tags, [])
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
        const { startDate, endDate } = req.query;
        let query = "SELECT * FROM planner ORDER BY dayIndex ASC";
        let params: any[] = [];
        
        if (startDate && endDate) {
            query = "SELECT * FROM planner WHERE dateStr BETWEEN ? AND ? ORDER BY dayIndex ASC";
            params = [startDate, endDate];
        }
        
        const [plannerRows]: any = await pool.query(query, params);
        const [recipeRows]: any = await pool.query("SELECT * FROM recipes");

        const recipeMap = new Map(recipeRows.map((r: any) => [r.id, {
            ...r,
            ingredients: safeParse(r.ingredients, []),
            tags: safeParse(r.tags, [])
        }]));

        res.json(plannerRows.map((p: any) => {
            const recipeIds = safeParse<string[]>(p.recipeIds, []);
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
        const { dayIndex, dateStr, mealType, recipeIds, helperName } = req.body;
        const id = dateStr ? `${dateStr}-${mealType}` : `day-${dayIndex}-${mealType}`;
        await pool.query(`
      REPLACE INTO planner (id, dayIndex, dateStr, mealType, recipeIds, helperName)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, dayIndex, dateStr || null, mealType, JSON.stringify(recipeIds), helperName]);
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
        
        // User requested to upload images manually, so we don't automatically assign an Unsplash image anymore.
        // We will default to a local placeholder if needed, or leave it empty.
        if (!recipeData.image || !recipeData.image.startsWith("http")) {
             recipeData.image = null; // Let the frontend handle the missing image state
        }

        console.log("[API Generate] Sending generated recipe back to frontend.");

        res.json(recipeData);
    } catch (error: any) {
        console.error("Generation error:", error);
        res.status(500).json({ error: "Failed to generate recipe: " + error.message });
    }
});

// --- Wochen-Generator mit Einkaufs-Optimierung ---

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MEAL_LABELS: Record<string, string> = { lunch: "Mittagessen", dinner: "Abendessen" };

const HALAL_RULE = "🚫 STRIKTE HALAL-REGELN: Niemals Alkohol, Schweinefleisch, Schmalz oder andere haram Zutaten. Alles Fleisch muss halal sein.";

// Einheitliches Antwort-Schema für ein generiertes Gericht
const recipeProps = {
    title: { type: Type.STRING },
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
    mealTime: { type: Type.STRING, nullable: true },
    category: { type: Type.STRING, nullable: true },
    englishSearchTerm: { type: Type.STRING, nullable: true }
};

// Kompakte Sicht auf die vorhandene Sammlung für den Prompt
function recipeContext(recipes: any[]): string {
    return recipes.map(r => {
        const ings = (r.ingredients || []).map((i: any) => i.name).filter(Boolean).join(", ");
        return `- id:"${r.id}" | ${r.title} | ${r.mealTime || "?"} | Zutaten: ${ings}`;
    }).join("\n");
}

// Anzahl verschiedener einzukaufender Produkte (ohne Vorrat) server-seitig berechnen
function computeShoppingCount(recipes: any[], pantry: string[]): number {
    const pantryLower = new Set(pantry.map(p => p.toLowerCase().trim()));
    const products = new Set<string>();
    for (const r of recipes) {
        for (const ing of (r.ingredients || [])) {
            const name = (ing?.name || "").toLowerCase().trim();
            if (!name || ing?.isPantry || pantryLower.has(name)) continue;
            products.add(name);
        }
    }
    return products.size;
}

apiRouter.post("/generate-week", async (req, res) => {
    try {
        const { meals = ["dinner"], variety = 50, themeDays = {} } = req.body;
        const mealList: string[] = Array.isArray(meals) && meals.length ? meals : ["dinner"];

        const [recipeRows]: any = await pool.query("SELECT * FROM recipes");
        const existingRecipes = recipeRows.map((r: any) => ({
            ...r,
            ingredients: safeParse(r.ingredients, []),
            tags: safeParse(r.tags, [])
        }));
        const pantry = await getPantry();

        const slotsList: string[] = [];
        for (let day = 0; day < 7; day++) {
            for (const meal of mealList) {
                const theme = themeDays?.[String(day)] ? ` (Themen-Tag: ${themeDays[String(day)]})` : "";
                slotsList.push(`Tag ${day} (${DAY_NAMES[day]}) – ${MEAL_LABELS[meal] || meal}${theme}`);
            }
        }

        // variety: 0 = möglichst sparsam einkaufen, 100 = maximale Abwechslung
        const varietyHint = variety <= 33
            ? "PRIORITÄT: möglichst WENIGE verschiedene Produkte. Lass Zutaten sich stark überschneiden, plane Gerichte mit geteilten frischen Zutaten nahe beieinander."
            : variety >= 67
                ? "PRIORITÄT: maximale ABWECHSLUNG. Vermeide Wiederholungen, biete kulinarische Vielfalt."
                : "PRIORITÄT: ausgewogen zwischen Abwechslung und sparsamem Einkauf.";

        const prompt = `Du bist Familien-Koch und planst einen Wochenplan für eine muslimische Familie.

ZU FÜLLENDE SLOTS:
${slotsList.join("\n")}

VORHANDENE REZEPTSAMMLUNG (bevorzugt verwenden! Referenziere per id, erfinde nur Neues für Lücken):
${existingRecipes.length ? recipeContext(existingRecipes) : "(noch keine Rezepte vorhanden – alles neu erfinden)"}

GRUNDVORRAT (immer vorhanden, NICHT als Einkauf zählen, darf großzügig verwendet werden):
${pantry.join(", ")}

EINKAUFS-OPTIMIERUNG:
${varietyHint}
Frische Zutaten (Rahm, Kräuter, Salat) sollen vollständig aufgebraucht werden – plane Gerichte, die sie teilen, nahe beieinander.

REGELN:
1. Für jeden Slot genau einen Eintrag in "plan".
2. Wenn ein passendes Rezept aus der Sammlung kommt: fromCollection=true und die exakte recipeId angeben (KEINE neuen Felder nötig).
3. Wenn neu erfunden: fromCollection=false, volle Rezeptdaten (title, ingredients mit isPantry, instructions als Markdown mit nummerierten Schritten, tags, mealTime, category).
4. category ist "komplett", "gemuese", "fleisch" oder "staerke". mealTime passend zum Slot ("lunch"/"dinner").
5. Antworte auf Deutsch (außer englishSearchTerm).
6. "einkaufsliste_anzahl": Zahl der verschiedenen einzukaufenden Produkte (ohne Grundvorrat).
7. "geteilt": Liste geteilter frischer Zutaten im Format ["Rahm: Mo + Mi", "Peperoni: Di + Do"].
${HALAL_RULE}`;

        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
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
                        plan: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    dayIndex: { type: Type.NUMBER },
                                    mealType: { type: Type.STRING },
                                    fromCollection: { type: Type.BOOLEAN },
                                    recipeId: { type: Type.STRING, nullable: true },
                                    ...recipeProps,
                                    title: { type: Type.STRING, nullable: true }
                                },
                                required: ["dayIndex", "mealType", "fromCollection"]
                            }
                        },
                        einkaufsliste_anzahl: { type: Type.NUMBER, nullable: true },
                        geteilt: { type: Type.ARRAY, items: { type: Type.STRING, nullable: true }, nullable: true }
                    },
                    required: ["plan"]
                }
            }
        });

        const data = JSON.parse(aiResponse.text || "{}");
        const recipeById = new Map(existingRecipes.map((r: any) => [r.id, r]));

        const slots = (data.plan || []).map((entry: any) => {
            if (entry.fromCollection && entry.recipeId && recipeById.has(entry.recipeId)) {
                return { dayIndex: entry.dayIndex, mealType: entry.mealType, recipe: recipeById.get(entry.recipeId), isNew: false };
            }
            // Neu erfundenes Rezept als Rezept-Objekt aufbereiten
            const recipe = {
                id: `ai-week-${Math.random().toString(36).substring(2, 11)}`,
                title: entry.title || "Neues Gericht",
                image: null,
                prepTime: entry.prepTime || "",
                mealTime: entry.mealType,
                category: entry.category || null,
                ingredients: entry.ingredients || [],
                instructions: entry.instructions || "",
                tags: entry.tags || []
            };
            return { dayIndex: entry.dayIndex, mealType: entry.mealType, recipe, isNew: true };
        });

        const chosenRecipes = slots.map((s: any) => s.recipe);
        const count = computeShoppingCount(chosenRecipes, pantry);

        res.json({
            slots,
            count,
            shared: Array.isArray(data.geteilt) ? data.geteilt.filter(Boolean) : []
        });
    } catch (error: any) {
        console.error("Week generation error:", error);
        res.status(500).json({ error: "Wochenplan konnte nicht erstellt werden: " + error.message });
    }
});

// Einen einzelnen Slot neu würfeln (Reroll), bestehende Titel vermeiden
apiRouter.post("/generate-day", async (req, res) => {
    try {
        const { mealType = "dinner", avoidTitles = [] } = req.body;

        const [recipeRows]: any = await pool.query("SELECT * FROM recipes");
        const existingRecipes = recipeRows.map((r: any) => ({
            ...r,
            ingredients: safeParse(r.ingredients, []),
            tags: safeParse(r.tags, [])
        }));
        const pantry = await getPantry();

        const prompt = `Schlage EIN ${MEAL_LABELS[mealType] || mealType} für eine muslimische Familie vor.

VORHANDENE SAMMLUNG (bevorzugen, per id referenzieren wenn passend):
${existingRecipes.length ? recipeContext(existingRecipes) : "(keine vorhanden)"}

GRUNDVORRAT (nicht einkaufen): ${pantry.join(", ")}

Vermeide diese bereits geplanten Gerichte: ${(avoidTitles || []).join(", ") || "(keine)"}.
Antworte auf Deutsch. Wenn aus der Sammlung: fromCollection=true + recipeId. Sonst volle Rezeptdaten.
${HALAL_RULE}`;

        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fromCollection: { type: Type.BOOLEAN },
                        recipeId: { type: Type.STRING, nullable: true },
                        ...recipeProps,
                        title: { type: Type.STRING, nullable: true }
                    },
                    required: ["fromCollection"]
                }
            }
        });

        const entry = JSON.parse(aiResponse.text || "{}");
        const recipeById = new Map(existingRecipes.map((r: any) => [r.id, r]));

        if (entry.fromCollection && entry.recipeId && recipeById.has(entry.recipeId)) {
            return res.json({ recipe: recipeById.get(entry.recipeId), isNew: false });
        }
        const recipe = {
            id: `ai-week-${Math.random().toString(36).substring(2, 11)}`,
            title: entry.title || "Neues Gericht",
            image: null,
            prepTime: entry.prepTime || "",
            mealTime: mealType,
            category: entry.category || null,
            ingredients: entry.ingredients || [],
            instructions: entry.instructions || "",
            tags: entry.tags || []
        };
        res.json({ recipe, isNew: true });
    } catch (error: any) {
        console.error("Day generation error:", error);
        res.status(500).json({ error: "Gericht konnte nicht erstellt werden: " + error.message });
    }
});
