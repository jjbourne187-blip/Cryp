import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  try {
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, publicKey: usersTable.publicKey, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/users/search", requireAuth, async (req, res) => {
  const q = String(Array.isArray(req.query.q) ? req.query.q[0] : (req.query.q ?? "")).toLowerCase().trim();
  if (!q || q.length < 2) { res.json([]); return; }
  try {
    const results = await db
      .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, publicKey: usersTable.publicKey })
      .from(usersTable)
      .where(ilike(usersTable.username, `%${q}%`))
      .limit(10);
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Search users error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/users/:username", requireAuth, async (req, res) => {
  const username = String(req.params.username);
  try {
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, publicKey: usersTable.publicKey })
      .from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase()))
      .limit(1);
    if (!user) { res.status(404).json({ error: "USER NOT FOUND in the network" }); return; }
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
