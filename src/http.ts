#!/usr/bin/env node
// Standalone Streamable HTTP server: `npm run start:http` then POST to http://localhost:3000/mcp
import { createServer as createHttpServer } from "node:http";
import { handleMcp, INFO } from "./http-handler.js";

const port = Number(process.env.PORT || 3000);
createHttpServer((req, res) => {
  const path = (req.url || "/").split("?")[0];
  if (path === "/mcp" || path === "/api/mcp") return void handleMcp(req, res);
  if (path === "/" || path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return void res.end(JSON.stringify(INFO));
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found", endpoint: "/mcp" }));
}).listen(port, () => console.error(`ai-interview-questions-mcp HTTP listening on http://localhost:${port}/mcp`));
