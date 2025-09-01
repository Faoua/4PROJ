-- CreateEnum
CREATE TYPE "public"."FeedStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "public"."Feed" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "update_freq_min" INTEGER NOT NULL DEFAULT 60,
    "status" "public"."FeedStatus" NOT NULL DEFAULT 'active',
    "last_fetched_at" TIMESTAMP(3),

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Article" (
    "id" TEXT NOT NULL,
    "feed_id" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "author" TEXT,
    "published_at" TIMESTAMP(3),
    "summary" TEXT,
    "content_html" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feed_collection_id_idx" ON "public"."Feed"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "Feed_collection_id_url_key" ON "public"."Feed"("collection_id", "url");

-- CreateIndex
CREATE INDEX "Article_feed_id_idx" ON "public"."Article"("feed_id");

-- CreateIndex
CREATE UNIQUE INDEX "Article_feed_id_guid_key" ON "public"."Article"("feed_id", "guid");

-- AddForeignKey
ALTER TABLE "public"."Feed" ADD CONSTRAINT "Feed_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "public"."Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
