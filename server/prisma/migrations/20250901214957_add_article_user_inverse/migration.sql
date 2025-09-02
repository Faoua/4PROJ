-- AlterTable
ALTER TABLE "public"."Article" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "public"."ArticleUser" (
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleUser_pkey" PRIMARY KEY ("article_id","user_id")
);

-- CreateIndex
CREATE INDEX "ArticleUser_user_id_idx" ON "public"."ArticleUser"("user_id");

-- AddForeignKey
ALTER TABLE "public"."ArticleUser" ADD CONSTRAINT "ArticleUser_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleUser" ADD CONSTRAINT "ArticleUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
