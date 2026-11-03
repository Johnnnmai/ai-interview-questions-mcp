// Vercel Function: Streamable HTTP MCP endpoint (stateless, read-only, no auth).
// vercel.json rewrites /mcp and / to this function. Uses the committed build/ output.
import { handleMcp } from "../build/http-handler.js";

export default async function handler(req, res) {
  await handleMcp(req, res);
}
