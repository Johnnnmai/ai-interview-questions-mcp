// Streamable HTTP test: starts build/http.js on a free port, then initialize, tools/list and tools/call over HTTP.
// Set MCP_URL=https://.../mcp to run the same checks against a deployed server instead.
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let child, url = process.env.MCP_URL;
if (!url) {
  const port = 3900 + Math.floor(Math.random() * 90);
  child = spawn(process.execPath, ["build/http.js"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "ignore", "pipe"] });
  await new Promise((ok, bad) => { child.stderr.on("data", (d) => String(d).includes("listening") && ok()); child.on("exit", bad); });
  url = `http://localhost:${port}/mcp`;
}
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "PASS" : "FAIL"} http ${name}${extra ? " :: " + extra : ""}`); };
try {
  const client = new Client({ name: "http-smoke", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  t("initialize", client.getServerVersion()?.name === "ai-interview-questions-mcp", JSON.stringify(client.getServerVersion()));
  const tools = (await client.listTools()).tools.map((x) => x.name).sort();
  t("tools/list", tools.join() === "get_question,list_topics,random_question,search_questions");
  const r = await client.callTool({ name: "get_question", arguments: { id: "aie-026" } });
  t("tools/call get_question aie-026", r.content[0].text.includes("## Model answer"));
  const r2 = await client.callTool({ name: "get_question", arguments: { id: "ib-001" } });
  t("tools/call get_question ib-001", r2.content[0].text.includes("ib-top-30-questions"));
  await client.close();
  const g = await fetch(url);
  t("GET info", g.status === 200 && (await g.json()).transport === "streamable-http");
} catch (e) { t("exception", false, String(e)); }
child?.kill();
console.log(`HTTP RESULT: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
