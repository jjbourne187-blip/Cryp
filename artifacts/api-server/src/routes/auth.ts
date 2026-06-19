import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function generateId(): string {
  return Date.now().toString(36) + crypto.randomBytes(8).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
}

function generatePublicKey(): string {
  return "0x" + crypto.randomBytes(20).toString("hex");
}

router.post("/auth/register", async (req, res) => {
  const { username, password, displayName } = req.body ?? {};
  if (!username || !password || !displayName) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  if (username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase().trim()))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "USERNAME TAKEN: Identity already registered" });
      return;
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = `${salt}:${hashPassword(password, salt)}`;
    const userId = generateId();
    await db.insert(usersTable).values({
      id: userId,
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      passwordHash,
      publicKey: generatePublicKey(),
    });
    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      id: generateId(),
      userId,
      token,
    });
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, publicKey: usersTable.publicKey, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    res.status(201).json({ token, user });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  try {
    const [found] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase().trim()))
      .limit(1);
    if (!found) {
      res.status(401).json({ error: "ACCESS DENIED: Invalid credentials" });
      return;
    }
    const [salt, storedHash] = found.passwordHash.split(":");
    const inputHash = hashPassword(password, salt);
    if (inputHash !== storedHash) {
      res.status(401).json({ error: "ACCESS DENIED: Invalid credentials" });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      id: generateId(),
      userId: found.id,
      token,
    });
    const { passwordHash: _ph, ...user } = found;
    res.json({ token, user });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    } catch {}
  }
  res.json({ ok: true });
});

export default router;
