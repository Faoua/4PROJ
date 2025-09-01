import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { authGuard } from "../../auth/jwt";
import { assertMember, getUserId } from "../collections/members.util";
import { refreshFeed } from "./rss.worker";
import type { Prisma } from "@prisma/client"; 

const router = Router();

const CreateFeedSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  updateFreqMin: z.number().int().positive().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

/** POST /collections/:id/feeds */
router.post("/collections/:id/feeds", authGuard, async (req, res) => {
  const { id: collectionId } = req.params;
  const userId = getUserId(req);
  await assertMember(collectionId, userId); // 403 si pas membre

  const parse = CreateFeedSchema.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: "Invalid body", details: parse.error.flatten() });
  }

  const { url, title, description, updateFreqMin, status } = parse.data;

  const created = await prisma.feed.create({
    data: {
      collectionId,
      url,
      title: title ?? url,
      description: description ?? null,
      updateFreqMin: updateFreqMin ?? 60,
      status: status ?? "active",
    },
  });

  // (optionnel) lancer un refresh en arrière-plan — pas bloquant
  refreshFeed(created.id).catch(() => {});

  return res.status(201).json({ feed: created });
});

/** GET /collections/:id/feeds */
router.get("/collections/:id/feeds", authGuard, async (req, res) => {
  const { id: collectionId } = req.params;
  const userId = getUserId(req);
  await assertMember(collectionId, userId);

  const feeds = await prisma.feed.findMany({
    where: { collectionId },
    orderBy: { title: "asc" },
  });

  return res.json({ feeds });
});

/** POST /feeds/:feedId/refresh (force un refresh) */
router.post("/feeds/:feedId/refresh", authGuard, async (req, res) => {
  const { feedId } = req.params;
  const userId = getUserId(req);

  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed) return res.status(404).json({ error: "Feed not found" });

  await assertMember(feed.collectionId, userId);

  await refreshFeed(feedId);
  return res.json({ ok: true });
});

/** GET /collections/:id/articles ?page=&pageSize= */
router.get("/collections/:id/articles", authGuard, async (req, res) => {
  const { id: collectionId } = req.params;
  const userId = getUserId(req);
  await assertMember(collectionId, userId);

  const page = Math.max(parseInt(String(req.query.page ?? "1")), 1);
  const pageSize = Math.min(
    Math.max(parseInt(String(req.query.pageSize ?? "20")), 1),
    100
  );

  // Séparer les requêtes pour garder les types Prisma → pas d'erreur sur `a =>`
  const articles = await prisma.article.findMany({
    where: { feed: { is: { collectionId } } },
    include: { feed: { select: { id: true, title: true } } },
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const total = await prisma.article.count({
    where: { feed: { is: { collectionId } } },
  });

  return res.json({
    page,
    pageSize,
    total,
     articles: articles.map((a: typeof articles[number]) => ({
    id: a.id,
   feedId: a.feedId,
  feedTitle: a.feed.title,
  title: a.title,
  link: a.link,
  author: a.author,
  publishedAt: a.publishedAt,
  summary: a.summary,
})),

  });
});

export default router;

