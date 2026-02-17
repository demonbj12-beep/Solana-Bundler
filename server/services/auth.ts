import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { get } from "./database";

const DEV_SECRET = "dev-secret-do-not-use-in-production";

function getSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET or SESSION_SECRET environment variable must be set in production");
  }
  return DEV_SECRET;
}

const EXPIRY = process.env.JWT_EXPIRY || "24h";

export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: "access" }, getSecret(), { expiresIn: EXPIRY, algorithm: "HS256" });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, getSecret(), { expiresIn: "30d", algorithm: "HS256" });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    encryptionSalt: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });

    const token = auth.split(" ")[1];
    const decoded = verifyToken(token);
    if (decoded.type !== "access") return res.status(401).json({ error: "Invalid token type" });

    const user = get("SELECT id, email, is_active, encryption_salt FROM users WHERE id = ?", [decoded.userId]);
    if (!user || !user.is_active) return res.status(401).json({ error: "Unauthorized" });

    req.user = { id: user.id, email: user.email, encryptionSalt: user.encryption_salt };
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    return res.status(401).json({ error: "Invalid token" });
  }
}
