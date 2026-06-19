import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { contactsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router = Router();

function generateId(): string {
  return Date.now().toString(36) + crypto.randomBytes(8).toString("hex");
}

router.get("/contacts", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  try {
    const rows = await db
      .select({
        id: contactsTable.id,
        userId: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        publicKey: usersTable.publicKey,
      })
      .from(contactsTable)
      .innerJoin(usersTable, eq(usersTable.id, contactsTable.contactUserId))
      .where(eq(contactsTable.userId, userId));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List contacts error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/contacts", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const { username } = req.body ?? {};
  if (!username) { res.status(400).json({ error: "Username required" }); return; }

  try {
    const [targetUser] = await db
      .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, publicKey: usersTable.publicKey })
      .from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase().trim()))
      .limit(1);
    if (!targetUser) {
      res.status(404).json({ error: "USER NOT FOUND in the network" });
      return;
    }
    if (targetUser.id === userId) {
      res.status(400).json({ error: "Cannot add yourself" });
      return;
    }
    const [existing] = await db
      .select({ id: contactsTable.id })
      .from(contactsTable)
      .where(and(eq(contactsTable.userId, userId), eq(contactsTable.contactUserId, targetUser.id)))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Contact already added" });
      return;
    }
    const id = generateId();
    await db.insert(contactsTable).values({ id, userId, contactUserId: targetUser.id });
    res.status(201).json({
      id,
      userId: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.displayName,
      publicKey: targetUser.publicKey,
    });
  } catch (err) {
    req.log.error({ err }, "Add contact error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
