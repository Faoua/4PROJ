import { createServer } from "http";
import app from "./app";
import cron from "node-cron";
import { fetchDueFeeds } from "./modules/feeds/rss.worker";
const port = process.env.PORT || 8080;
const server = createServer(app);

cron.schedule("*/5 * * * *", () => {
  fetchDueFeeds(10).catch((e) => console.error(e));
});
server.listen(port, () => {
  console.log(`API listening on :${port}`);
});
