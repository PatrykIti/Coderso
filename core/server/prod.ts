import { startHttpServer } from "./httpServer";

const port = Number(process.env.PORT ?? 3000);
const server = startHttpServer({ port });

console.log(`Core HTTP server listening on http://0.0.0.0:${server.port}`);
