import { createServer } from "http";
import app from "./app";

const port = process.env.PORT || 8080;
const server = createServer(app);

server.listen(port, () => {
  console.log(`API listening on :${port}`);
});
