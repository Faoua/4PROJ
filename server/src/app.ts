import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import collectionsRouter from "./modules/collections/collections.routes";
import authRouter from "./modules/users/auth.routes"; 
import feedsRouter from "./modules/feeds/feeds.routes";
import articlesRouter from "./modules/articles/articles.routes";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/feeds", rateLimit({ windowMs: 60_000, max: 30 }));
app.use('/auth', authRouter);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('UNCAUGHT_ERROR:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});
app.use("/collections", collectionsRouter);
app.use("/", feedsRouter);
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
app.use(articlesRouter);

export default app;
