import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { conversationsTable, conversationParticipantsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, inArray, desc, gt } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router = Router();

function generateId(): string {
  return Date.now().toString(36) + crypto.randomBytes(8).toString("hex");
}

async function getUserConversations(userId: string) {
  const participantRows = await db
    .select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, userId));

  if (participantRows.length === 0) return [];
  const convoIds = participantRows.map((r) => r.conversationId);

  const convos = await db
    .select()
    .from(conversationsTable)
    .where(inArray(conversationsTable.id, convoIds))
    .orderBy(desc(conversationsTable.lastMessageTime));

  const allParticipants = await db
    .select({
      conversationId: conversationParticipantsTable.conversationId,
      userId: usersTable.id,
      displayName: usersTable.displayName,
    })
    .from(conversationParticipantsTable)
    .innerJoin(usersTable, eq(usersTable.id, conversationParticipantsTable.userId))
    .where(inArray(conversationParticipantsTable.conversationId, convoIds));

  return convos.map((c) => {
    const participants = allParticipants.filter((p) => p.conversationId === c.id);
    const participantNames: Record<string, string> = {};
    for (const p of participants) participantNames[p.userId] = p.displayName;
    return {
      id: c.id,
      participantIds: participants.map((p) => p.userId),
      participantNames,
      lastMessage: c.lastMessage,
      lastMessageTime: c.lastMessageTime?.toISOString() ?? null,
      ghostMode: c.ghostMode,
      unreadCount: 0,
    };
  });
}

router.get("/conversations", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  try {
    res.json(await getUserConversations(userId));
  } catch (err) {
    req.log.error({ err }, "List conversations error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/conversations", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const { contactUserId } = req.body ?? {};
  if (!contactUserId) { res.status(400).json({ error: "contactUserId required" }); return; }

  try {
    const myConvos = await db
      .select({ conversationId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, userId));
    const myConvoIds = myConvos.map((r) => r.conversationId);

    if (myConvoIds.length > 0) {
      const theirConvos = await db
        .select({ conversationId: conversationParticipantsTable.conversationId })
        .from(conversationParticipantsTable)
        .where(and(
          eq(conversationParticipantsTable.userId, contactUserId),
          inArray(conversationParticipantsTable.conversationId, myConvoIds)
        ));
      if (theirConvos.length > 0) {
        const convos = await getUserConversations(userId);
        const existing = convos.find((c) => c.id === theirConvos[0].conversationId);
        if (existing) { res.json(existing); return; }
      }
    }

    const convoId = generateId();
    await db.insert(conversationsTable).values({ id: convoId });
    await db.insert(conversationParticipantsTable).values([
      { conversationId: convoId, userId },
      { conversationId: convoId, userId: contactUserId },
    ]);
    const convos = await getUserConversations(userId);
    res.status(201).json(convos.find((c) => c.id === convoId));
  } catch (err) {
    req.log.error({ err }, "Create conversation error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const id = String(req.params.id);
  const since = req.query.since ? Number(req.query.since) : 0;

  try {
    const [participant] = await db
      .select()
      .from(conversationParticipantsTable)
      .where(and(
        eq(conversationParticipantsTable.conversationId, id),
        eq(conversationParticipantsTable.userId, userId)
      ))
      .limit(1);
    if (!participant) { res.status(403).json({ error: "Not a participant" }); return; }

    const now = Date.now();
    let query = db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(100);

    const rows = await query;
    const alive = rows.filter((m) => !m.expiresAt || m.expiresAt > now);

    const formatted = alive.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      isEncrypted: true,
      expiresAt: m.expiresAt ?? undefined,
    }));

    if (since > 0) {
      res.json(formatted.filter((m) => new Date(m.timestamp).getTime() > since));
      return;
    }

    res.json(formatted);
  } catch (err) {
    req.log.error({ err }, "Get messages error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const id = String(req.params.id);
  const { content, ghostDuration } = req.body ?? {};
  if (!content) { res.status(400).json({ error: "Content required" }); return; }

  try {
    const [participant] = await db
      .select()
      .from(conversationParticipantsTable)
      .where(and(
        eq(conversationParticipantsTable.conversationId, id),
        eq(conversationParticipantsTable.userId, userId)
      ))
      .limit(1);
    if (!participant) { res.status(403).json({ error: "Not a participant" }); return; }

    const msgId = generateId();
    const expiresAt = ghostDuration ? Date.now() + ghostDuration : null;
    await db.insert(messagesTable).values({
      id: msgId,
      conversationId: id,
      senderId: userId,
      content,
      expiresAt,
    });
    await db.update(conversationsTable)
      .set({ lastMessage: content, lastMessageTime: new Date() })
      .where(eq(conversationsTable.id, id));

    const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
    res.status(201).json({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      isEncrypted: true,
      expiresAt: msg.expiresAt ?? undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Send message error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.patch("/conversations/:id/ghost", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const id = String(req.params.id);
  const { duration } = req.body ?? {};

  try {
    const [participant] = await db
      .select()
      .from(conversationParticipantsTable)
      .where(and(
        eq(conversationParticipantsTable.conversationId, id),
        eq(conversationParticipantsTable.userId, userId)
      ))
      .limit(1);
    if (!participant) { res.status(403).json({ error: "Not a participant" }); return; }
    await db.update(conversationsTable)
      .set({ ghostMode: duration ?? null })
      .where(eq(conversationsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Set ghost mode error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/conversations/:id/messages", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const id = String(req.params.id);
  try {
    const [participant] = await db
      .select()
      .from(conversationParticipantsTable)
      .where(and(
        eq(conversationParticipantsTable.conversationId, id),
        eq(conversationParticipantsTable.userId, userId)
      ))
      .limit(1);
    if (!participant) { res.status(403).json({ error: "Not a participant" }); return; }
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
    await db.update(conversationsTable)
      .set({ lastMessage: null, lastMessageTime: null })
      .where(eq(conversationsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Wipe messages error");
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/messages/wipe", requireAuth, async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  try {
    const participantRows = await db
      .select({ conversationId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, userId));
    const convoIds = participantRows.map((r) => r.conversationId);
    if (convoIds.length > 0) {
      await db.delete(messagesTable).where(inArray(messagesTable.conversationId, convoIds));
      for (const cid of convoIds) {
        await db.update(conversationsTable)
          .set({ lastMessage: null, lastMessageTime: null })
          .where(eq(conversationsTable.id, cid));
      }
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Wipe all messages error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
