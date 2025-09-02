import { Router } from "express";
import { prisma } from "../../utils/prisma";
import { authGuard } from "../../auth/jwt";
import { getUserId } from "../collections/members.util";

const router = Router();

/**
 * POST /articles/:id/read
 * Marque un article comme "lu" pour l'utilisateur courant
 */
router.post("/articles/:id/read", authGuard, async (req, res) => {
  const userId = getUserId(req);
  const { id: articleId } = req.params;

  // Vérifie que l'article existe
  const art = await prisma.article.findUnique({
    where: { id: articleId },
    include: { feed: { select: { collectionId: true } } },
  });
  if (!art) return res.status(404).json({ error: "Article not found" });

  // Vérifie que l'utilisateur est membre de la collection
  const membership = await prisma.collectionMember.findUnique({
    where: { collectionId_userId: { collectionId: art.feed.collectionId, userId } },
  });
  if (!membership) return res.status(403).json({ error: "Forbidden (not a member)" });

  // Upsert l'état utilisateur
    const state = await prisma.articleUser.upsert({
  where: { articleId_userId: { articleId, userId } }, 
  update: { read: true },
  create: { articleId, userId, read: true, favorite: false },
});

  return res.json({ ok: true, state });
});

/**
 * POST /articles/:id/favorite
 * Marque un article comme "favori" pour l'utilisateur courant
 */
router.post("/articles/:id/favorite", authGuard, async (req, res) => {
  const userId = getUserId(req);
  const { id: articleId } = req.params;

  // Vérifie que l'article existe
  const art = await prisma.article.findUnique({
    where: { id: articleId },
    include: { feed: { select: { collectionId: true } } },
  });
  if (!art) return res.status(404).json({ error: "Article not found" });

  // Vérifie que l'utilisateur est membre de la collection
  const membership = await prisma.collectionMember.findUnique({
    where: { collectionId_userId: { collectionId: art.feed.collectionId, userId } },
  });
  if (!membership) return res.status(403).json({ error: "Forbidden (not a member)" });

  // Upsert l'état utilisateur
  const state = await prisma.articleUser.upsert({
    where: { articleId_userId: { articleId, userId } },
    update: { favorite: true },
    create: { articleId, userId, read: false, favorite: true },
  });

  return res.json({ ok: true, state });
});

export default router;
