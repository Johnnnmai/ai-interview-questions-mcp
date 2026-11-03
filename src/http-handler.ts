// Stateless Streamable HTTP handler: a fresh server and transport per request.
// Read-only tools, no auth, no sessions, no stored data. Shared by src/http.ts and api/mcp.js (Vercel).
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, VERSION } from "./server.js";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

export const INFO = {
  name: "ai-interview-questions-mcp",
  version: VERSION,
  transport: "streamable-http",
  endpoint: "/mcp",
  tools: ["list_topics", "search_questions", "get_question", "random_question"],
  questions: { "ai-engineer": 100, "investment-banking": 100 },
  publisher: "Valenx Press",
  source: "https://github.com/Johnnnmai/ai-interview-questions-mcp",
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

/** Handle one HTTP request to the MCP endpoint. `parsedBody` is used when a platform already parsed JSON. */
export async function handleMcp(req: IncomingMessage & { body?: unknown }, res: ServerResponse): Promise<void> {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && !String(req.headers.accept ?? "").includes("text/event-stream")) {
    sendJson(res, 200, INFO);
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. This stateless server accepts POST only." }, id: null });
    return;
  }
  let body: unknown;
  try {
    body = req.body !== undefined && req.body !== "" ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body) : await readBody(req);
  } catch {
    sendJson(res, 400, { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
    return;
  }
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (e) {
    if (!res.headersSent) sendJson(res, 500, { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
}
