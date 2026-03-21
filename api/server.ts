import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { initDb } from "./db.js";
import { apiRouter } from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function startServer() {
    await initDb();

    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    app.use("/api", apiRouter);
    app.use(express.static(path.join(rootDir, "public")));

    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
            root: rootDir
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static(path.join(rootDir, "dist")));
        app.get("*", (req, res) => {
            res.sendFile(path.join(rootDir, "dist", "index.html"));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    // Global Error Handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error("Unhandled Error:", err);
        res.status(500).json({ error: "Internal Server Error", details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    });
}

startServer().catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
