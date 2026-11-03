// End-to-end smoke test over stdio with the official MCP client.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: process.execPath, args: ["build/index.js"] });
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(transport);

let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " :: " + extra : ""}`); };
const txt = (r) => r.content.map((c) => c.text).join("\n");
const hasFooter = (s) => s.includes("utm_source=mcp") && s.includes("answer-check/");

const tools = (await client.listTools()).tools.map((x) => x.name).sort();
t("tools/list", JSON.stringify(tools) === JSON.stringify(["get_question", "list_topics", "random_question", "search_questions"]), tools.join(","));

let r = await client.callTool({ name: "list_topics", arguments: {} });
let s = txt(r); t("list_topics", s.includes("rag:") && s.includes("100 AI Engineer") && hasFooter(s)); console.log(s.split("\n").slice(0, 4).join("\n"));

r = await client.callTool({ name: "search_questions", arguments: { query: "kv cache" } });
s = txt(r); t("search_questions kv cache -> aie-003 first", s.split("\n")[1]?.includes("aie-003") && hasFooter(s), s.split("\n")[1]);

r = await client.callTool({ name: "search_questions", arguments: { query: "evaluate", topic: "rag", level: "Senior", limit: 3 } });
s = txt(r); t("search_questions with filters", s.includes("aie-031") && !s.includes("(evaluation)"), s.split("\n").slice(1, 4).join(" | "));

r = await client.callTool({ name: "search_questions", arguments: { query: "zzzqqq" } });
t("search_questions no match", txt(r).startsWith("No questions matched") && !r.isError);

r = await client.callTool({ name: "get_question", arguments: { id: "aie-026" } });
s = txt(r); t("get_question aie-026 full", s.includes("## Model answer") && s.includes("## Answer framework") && s.includes("## Common mistakes") && s.includes("answer-check/?q=what-is-rag") && s.includes("questions/what-is-rag/"));
console.log(s.slice(0, 400) + "\n...\n" + s.slice(-420));

r = await client.callTool({ name: "get_question", arguments: { id: "what-is-kv-cache", include_answer: false } });
s = txt(r); t("get_question by slug, answer hidden", s.includes("aie-003") && !s.includes("## Model answer"));

r = await client.callTool({ name: "get_question", arguments: { id: "100" } });
s = txt(r); t("get_question by number (no deep dive)", s.includes("aie-100") && s.includes("## Model answer") && hasFooter(s));

r = await client.callTool({ name: "get_question", arguments: { id: "aie-999" } });
t("get_question unknown -> isError", r.isError === true, txt(r));

const a = txt(await client.callTool({ name: "random_question", arguments: { count: 3, seed: 42, level: "Senior" } }));
const b = txt(await client.callTool({ name: "random_question", arguments: { count: 3, seed: 42, level: "Senior" } }));
t("random_question seeded replay", a === b && (a.match(/\[Senior\]/g) || []).length === 3 && hasFooter(a)); console.log(a.split("\n").slice(0, 4).join("\n"));

r = await client.callTool({ name: "random_question", arguments: { topic: "coding" } });
t("random_question topic filter", txt(r).includes("(coding)"));

r = await client.callTool({ name: "random_question", arguments: { count: 99 } }).catch((e) => ({ isError: true, content: [{ text: String(e) }] }));
t("random_question rejects count>10", r.isError === true);

const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
t("prompts/list", prompts.includes("mock_interview"));
const p = await client.getPrompt({ name: "mock_interview", arguments: { topic: "rag", level: "Mid", count: "3" } });
t("prompts/get mock_interview", p.messages[0].content.text.includes('random_question with count=3, topic="rag", level="Mid"'));

const res = await client.listResources();
t("resources/list", res.resources.length >= 201, String(res.resources.length));
const rr = await client.readResource({ uri: "aiq://question/aie-041" });
t("resources/read question", rr.contents[0].text.includes("aie-041"));
const rt = await client.readResource({ uri: "aiq://topics" });
t("resources/read topics", JSON.parse(rt.contents[0].text).topics.length === 14);

// Investment Banking track (v1.1.0). IB results link only to the free IB Top 30 guide.
const ibOnly = (s) => s.includes("ib-top-30-questions") && s.includes("utm_source=mcp") && !s.includes("github.io");
r = await client.callTool({ name: "list_topics", arguments: {} });
s = txt(r); t("list_topics shows 200 incl. IB", s.includes("200 interview questions") && s.includes("ib-accounting:") && s.includes("ib-lbo:"));

r = await client.callTool({ name: "get_question", arguments: { id: "ib-001" } });
s = txt(r); t("get_question ib-001", s.includes("three financial statements") && s.includes("## Model answer") && ibOnly(s));

r = await client.callTool({ name: "get_question", arguments: { id: "ib-100" } });
t("get_question ib-100", txt(r).includes("ib-100") && !r.isError);

r = await client.callTool({ name: "get_question", arguments: { id: "ib-101" } });
t("get_question ib-101 unknown -> isError", r.isError === true);

r = await client.callTool({ name: "search_questions", arguments: { query: "accretion dilution", track: "investment-banking" } });
s = txt(r); t("search_questions IB track", s.includes("ib-") && !s.includes("aie-") && ibOnly(s), s.split("\n")[1]);

r = await client.callTool({ name: "search_questions", arguments: { query: "enterprise value", topic: "ib-valuation" } });
t("search_questions IB topic filter", txt(r).includes("(ib-valuation)"));

r = await client.callTool({ name: "random_question", arguments: { track: "investment-banking", count: 5, seed: 7 } });
s = txt(r); t("random_question IB track", (s.match(/- ib-\d{3}/g) || []).length === 5 && ibOnly(s));

r = await client.callTool({ name: "random_question", arguments: { track: "ai-engineer", count: 5, seed: 7 } });
s = txt(r); t("random_question AIE track has no IB", (s.match(/- aie-\d{3}/g) || []).length === 5 && !s.includes("ib-top-30"));

const rib = await client.readResource({ uri: "aiq://question/ib-042" });
t("resources/read IB question", rib.contents[0].text.includes("ib-042") && ibOnly(rib.contents[0].text));

const pib = await client.getPrompt({ name: "mock_interview", arguments: { track: "investment-banking", count: "3" } });
t("prompts/get mock_interview IB", pib.messages[0].content.text.includes("Investment Banking") && pib.messages[0].content.text.includes('track="investment-banking"') && ibOnly(pib.messages[0].content.text));

const all = JSON.stringify(await Promise.all(["ib-001", "ib-050", "aie-001"].map((id) => client.callTool({ name: "get_question", arguments: { id } }))));
t("no em dashes in output", !all.includes("\u2014"));

await client.close();
console.log(`\nRESULT: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
