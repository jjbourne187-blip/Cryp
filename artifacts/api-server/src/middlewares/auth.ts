import { type RequestHandler } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthedRequest extends Express.Request {
  userId: string;
  username: string;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const [session] = await db
      .select({ userId: sessionsTable.userId })
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .limit(1);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    (req as unknown as AuthedRequest).userId = user.id;
    (req as unknown as AuthedRequest).username = user.username;
    next();
  } catch (err) {
    req.log.error({ err }, "Auth middleware error");
    res.status(500).json({ error: "Internal server error" });
  }
};
