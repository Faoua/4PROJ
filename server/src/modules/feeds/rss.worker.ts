import Parser from "rss-parser";
import { prisma } from "../../utils/prisma";

// Un seul parser réutilisé
const parser = new Parser({
  headers: { "User-Agent": "SUPRSS/1.0 (student project)" },
});

/* ---------- petites utilités ---------- */
const stripHtml = (html?: string | null) =>
  (html ?? "")
    .replace(/<[^>]*>/g, " ")            // enlève les tags
    .replace(/\s+/g, " ")                // compresse les espaces
    .trim() || null;

const normGuid = (item: any) => {
  return (
    item.guid ||
    item.link ||
    (item.title && item.isoDate && `${item.title}-${item.isoDate}`) ||
    "no-guid"
  );
};

/* ---------- rafraîchir un feed ---------- */
export async function refreshFeed(feedId: string) {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed || feed.status !== "active") return;

  try {
    const res = await parser.parseURL(feed.url);

    // Si le RSS a un titre/description et que notre feed est générique, on l'améliore
    const newTitle =
      feed.title === feed.url && res.title ? res.title : undefined;

    const newDescription =
      (feed.description == null || feed.description === "") && res.description
        ? stripHtml(res.description)
        : undefined;

    if (newTitle || newDescription) {
      await prisma.feed.update({
        where: { id: feed.id },
        data: {
          ...(newTitle ? { title: newTitle } : {}),
          ...(newDescription ? { description: newDescription } : {}),
        },
      });
    }

    for (const raw of res.items ?? []) {
      const guid = normGuid(raw);
      const title = raw.title ?? "(sans titre)";
      const link = raw.link ?? "";
      const author = (raw as any).creator ?? (raw as any).author ?? null;
      const iso = (raw as any).isoDate as string | undefined;
      const publishedAt = iso ? new Date(iso) : null;

      const summary =
        (raw as any).contentSnippet != null
          ? stripHtml((raw as any).contentSnippet)
          : null;

      // certaines sources utilisent "content:encoded"
      const contentHtml =
        ((raw as any)["content:encoded"] as string | undefined) ??
        ((raw as any).content as string | undefined) ??
        null;

      await prisma.article.upsert({
        where: { feedId_guid: { feedId: feed.id, guid } },
        create: {
          feedId: feed.id,
          guid,
          title,
          link,
          author,
          publishedAt,
          summary,
          contentHtml,
        },
        update: {
          // on garde le contenu existant, on met juste à jour le minimum
          title,
          link,
        },
      });
    }

    // marque le feed comme rafraîchi
    await prisma.feed.update({
      where: { id: feed.id },
      data: { lastFetchedAt: new Date() },
    });
  } catch {
    // on ne fait pas échouer l'appel appelant ; on marque juste l'heure de tentative
    await prisma.feed.update({
      where: { id: feed.id },
      data: { lastFetchedAt: new Date() },
    });
  }
}

/* ---------- sélectionner des feeds "à échéance" ---------- */
export async function fetchDueFeeds(limit = 10) {
  // On prend plus large puis on filtre côté JS pour respecter updateFreqMin
  const candidates = await prisma.feed.findMany({
    where: { status: "active" },
    orderBy: { lastFetchedAt: "asc" },
    take: Math.max(limit * 3, 20),
    select: {
      id: true,
      lastFetchedAt: true,
      updateFreqMin: true,
    },
  });

  const now = Date.now();
  const due = candidates
    .filter((f) => {
      const freqMs = (f.updateFreqMin ?? 60) * 60_000;
      return !f.lastFetchedAt || now - f.lastFetchedAt.getTime() > freqMs;
    })
    .slice(0, limit);

  for (const f of due) {
    refreshFeed(f.id).catch(() => {});
  }
}
