import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { authRouter } from "./routes/auth.js";
import { booksRouter } from "./routes/books.js";
import { membersRouter } from "./routes/members.js";
import { circulationRouter } from "./routes/circulation.js";
import { analyticsRouter } from "./routes/analytics.js";
import { authenticate } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");
export const app = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: { directives: { "script-src": ["'self'"], "style-src": ["'self'"], "img-src": ["'self'", "data:"] } } }));
app.use(compression());
app.use(pinoHttp());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ status: "success", data: { service: "library-management", time: new Date().toISOString() } }));
app.use("/api/auth", authRouter);
app.use("/api/books", authenticate, booksRouter);
app.use("/api/members", authenticate, membersRouter);
app.use("/api/circulation", authenticate, circulationRouter);
app.use("/api/analytics", authenticate, analyticsRouter);

app.use(express.static(publicDir));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.use(notFound);
app.use(errorHandler);
