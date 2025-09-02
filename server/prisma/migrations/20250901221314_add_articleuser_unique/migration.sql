/*
  Warnings:

  - A unique constraint covering the columns `[article_id,user_id]` on the table `ArticleUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ArticleUser_article_id_user_id_key" ON "public"."ArticleUser"("article_id", "user_id");
