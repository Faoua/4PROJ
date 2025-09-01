import Parser from "rss-parser";
import { prisma } from "../../utils/prisma";

const parser = new Parser({ headers: { "User-Agent": "SUPRSS/1.0 (student project)" } });

export async function refreshFeed(feedId: string) {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed || feed.status !== "active") return;

  const res = await parser.parseURL(feed.url);

  for (const item of res.items ?? []) {
    const guid = (item.guid || item.link || `${item.title}-${item.isoDate}`) ?? "no-guid";

    await prisma.article.upsert({
      where: { feedId_guid: { feedId: feed.id, guid } },
      create: {
        feedId: feed.id,
        guid,
        title: item.title ?? "(sans titre)",
        link: item.link ?? "",
        author: (item as any).creator ?? (item as any).author ?? null,
        publishedAt: item.isoDate ? new Date(item.isoDate) : null,
        summary: (item as any).contentSnippet ?? null,
        contentHtml: ((item as any)["content:encoded"] as string) ?? (item as any).content ?? null,
      },
      update: {
        title: item.title ?? "(sans titre)",
        link: item.link ?? "",
      },
    });
  }

  await prisma.feed.update({
    where: { id: feed.id },
    data: { lastFetchedAt: new Date() },
  });
}

export async function fetchDueFeeds(limit = 10) {
  const due = await prisma.feed.findMany({
    where: {
      status: "active",
      OR: [{ lastFetchedAt: null }, { lastFetchedAt: { lt: new Date(Date.now() - 60_000) } }],
    },
    orderBy: { lastFetchedAt: "asc" },
    take: limit,
  });

  for (const f of due) refreshFeed(f.id).catch(() => {});
}
