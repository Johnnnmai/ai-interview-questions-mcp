import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bank, counts, findQuestion, footer, IB_FREE, questionUrl, rng, search, selfCheckUrl, SITE, tracksOf, TRACKS, utm, type Level, type Question } from "./data.js";

export const VERSION = "1.1.0";
const LEVELS = ["Entry", "Mid", "Senior"] as const;
const TOPIC_IDS = bank.topics.map((t) => t.id) as [string, ...string[]];

const INSTRUCTIONS =
  "200 graded interview questions with model answers (Valenx Press): 100 AI Engineer (ids aie-001 to aie-100) and 100 Investment Banking (ids ib-001 to ib-100). Use list_topics to see topics, search_questions or random_question to pick questions (filter with track='ai-engineer' or track='investment-banking'), and get_question for the model answer, framework, follow-ups and common mistakes. For a mock interview, ask questions one at a time and reveal the model answer only after the candidate answers.";

/** Build a fresh MCP server with all tools, resources and prompts. Used by stdio and HTTP entry points. */
export function createServer(): McpServer {
const server = new McpServer({ name: "ai-interview-questions-mcp", version: VERSION }, { instructions: INSTRUCTIONS });

const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const err = (s: string) => ({ content: [{ type: "text" as const, text: s }], isError: true });
const line = (q: Question) => `- ${q.id} [${q.level}] (${q.topic}) ${q.question}`;
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

function renderQuestion(q: Question, includeAnswer: boolean, tool: string): string {
  const out: string[] = [`# ${q.id}: ${q.question}`, `Level: ${q.level} · Topic: ${q.topic_name}${q.subtopic ? ` (${q.subtopic})` : ""}`];
  if (!includeAnswer) {
    out.push("", "(Model answer hidden. Answer first, then call get_question with include_answer=true.)");
  } else {
    if (q.deep_dive?.what_it_tests) out.push("", `What it tests: ${q.deep_dive.what_it_tests}`);
    out.push("", "## Model answer", q.answer);
    if (q.deep_dive?.framework?.length) out.push("", "## Answer framework", ...q.deep_dive.framework.map((s, i) => `${i + 1}. ${s}`));
    const fus = q.deep_dive?.follow_ups?.length ? q.deep_dive.follow_ups.map((f) => `- ${f.q} ${f.a}`) : q.follow_up ? [`- ${q.follow_up}`] : [];
    if (fus.length) out.push("", "## Likely follow-ups", ...fus);
    if (q.deep_dive?.common_mistakes?.length) out.push("", "## Common mistakes", ...q.deep_dive.common_mistakes.map((m) => `- ${m}`));
    out.push("", q.track === "investment-banking" ? `More free IB practice (Top 30 guide): ${questionUrl(q, tool)}` : `Full page: ${questionUrl(q, tool)}`);
  }
  return out.join("\n") + footer(tool, q);
}

server.registerTool(
  "list_topics",
  {
    title: "List topics",
    description: "List the interview topics (AI Engineer and Investment Banking) with question counts per level (Entry, Mid, Senior).",
    inputSchema: {},
    annotations: RO,
  },
  async () => {
    const rows = bank.topics.map((t) => {
      const qs = bank.questions.filter((q) => q.topic === t.id);
      const c = (l: Level) => qs.filter((q) => q.level === l).length;
      return `- ${t.id}: ${t.name} (${qs.length} questions: ${c("Entry")} Entry, ${c("Mid")} Mid, ${c("Senior")} Senior; ids ${qs[0].id}-${qs[qs.length - 1].id})`;
    });
    return text(
      [`${bank.questions.length} interview questions: ${counts["ai-engineer"]} AI Engineer (aie-*) and ${counts["investment-banking"]} Investment Banking (ib-*), updated ${bank.updated}. IB topic ids start with ib-.`, "", ...rows].join("\n") +
        footer("list_topics"),
    );
  },
);

server.registerTool(
  "search_questions",
  {
    title: "Search questions",
    description: "Keyword search across questions and model answers. Optional track, topic and level filters. Returns question ids; use get_question for the full answer.",
    inputSchema: {
      query: z.string().min(1).describe("Keywords, e.g. 'kv cache', 'rag evaluation', 'prompt injection'"),
      topic: z.enum(TOPIC_IDS).optional().describe("Topic id from list_topics"),
      level: z.enum(LEVELS).optional(),
      track: z.enum(TRACKS).optional().describe("ai-engineer or investment-banking; omit to search both"),
      limit: z.number().int().min(1).max(25).default(10),
    },
    annotations: RO,
  },
  async ({ query, topic, level, track, limit }) => {
    const hits = search(query, topic, level, track).slice(0, limit);
    const tr = track ? [track] : undefined;
    if (!hits.length) return text(`No questions matched "${query}". Try fewer or broader keywords, or call list_topics.` + footer("search_questions", undefined, tr));
    return text([`${hits.length} match(es) for "${query}":`, ...hits.map((h) => line(h.q))].join("\n") + footer("search_questions", undefined, tracksOf(hits.map((h) => h.q))));
  },
);

server.registerTool(
  "get_question",
  {
    title: "Get question",
    description: "Get one question by id (e.g. 'aie-026' or 'ib-012'), number (26, AI Engineer) or slug ('what-is-rag'), with the model answer, answer framework, likely follow-ups and common mistakes.",
    inputSchema: {
      id: z.string().min(1).describe("Question id like 'aie-026' or 'ib-012', a number like '26', or a slug"),
      include_answer: z.boolean().default(true).describe("Set false to show only the question (for practice)"),
    },
    annotations: RO,
  },
  async ({ id, include_answer }) => {
    const q = findQuestion(id);
    if (!q) return err(`Unknown question "${id}". Valid ids are aie-001 to aie-${String(counts["ai-engineer"]).padStart(3, "0")} and ib-001 to ib-${String(counts["investment-banking"]).padStart(3, "0")}.`);
    return text(renderQuestion(q, include_answer, "get_question"));
  },
);

server.registerTool(
  "random_question",
  {
    title: "Random question",
    description: "Pick random questions for practice (answers hidden). Optional track, topic and level filters; pass a seed to replay the same set.",
    inputSchema: {
      topic: z.enum(TOPIC_IDS).optional(),
      level: z.enum(LEVELS).optional(),
      track: z.enum(TRACKS).optional().describe("ai-engineer or investment-banking; omit for both"),
      count: z.number().int().min(1).max(10).default(1),
      seed: z.number().int().optional().describe("Same seed and filters return the same questions"),
    },
    annotations: { ...RO, idempotentHint: false },
  },
  async ({ topic, level, track, count, seed }) => {
    const pool = bank.questions.filter((q) => (!topic || q.topic === topic) && (!level || q.level === level) && (!track || q.track === track));
    if (!pool.length) return err("No questions match those filters.");
    const r = rng(seed);
    const picked = [...pool];
    for (let i = picked.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [picked[i], picked[j]] = [picked[j], picked[i]];
    }
    const set = picked.slice(0, Math.min(count, picked.length));
    const body = [
      `Practice set (${set.length}): answer each out loud in under 2 minutes, then call get_question for the model answer.`,
      ...set.map(line),
    ].join("\n");
    return text(body + footer("random_question", set.length === 1 ? set[0] : undefined, tracksOf(set)));
  },
);

server.registerResource(
  "topics",
  "aiq://topics",
  { title: "Topics", description: "Topic ids and names", mimeType: "application/json" },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ source: utm(SITE, "resource"), ib_free_guide: utm(IB_FREE, "resource"), topics: bank.topics }, null, 1) }],
  }),
);

server.registerResource(
  "question",
  new ResourceTemplate("aiq://question/{id}", {
    list: async () => ({
      resources: bank.questions.map((q) => ({ uri: `aiq://question/${q.id}`, name: q.id, title: q.question, mimeType: "text/markdown" })),
    }),
  }),
  { title: "Interview question", description: "One question with its model answer", mimeType: "text/markdown" },
  async (uri, { id }) => {
    const q = findQuestion(String(id));
    if (!q) throw new Error(`Unknown question ${id}`);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: renderQuestion(q, true, "resource") }] };
  },
);

server.registerPrompt(
  "mock_interview",
  {
    title: "Mock interview",
    description: "Run a mock AI Engineer or Investment Banking interview round: one question at a time, feedback against the model answer, a 1-5 score per answer and a short study list at the end.",
    argsSchema: {
      topic: z.string().optional().describe("Topic id from list_topics, or leave empty for a mixed round"),
      level: z.string().optional().describe("Entry, Mid or Senior"),
      count: z.string().optional().describe("Number of questions, default 5"),
      track: z.string().optional().describe("ai-engineer (default) or investment-banking"),
    },
  },
  ({ topic, level, count, track }) => {
    const ibTrack = track === "investment-banking" || !!topic?.startsWith("ib-");
    const tr = ibTrack ? "investment-banking" : "ai-engineer";
    const role = ibTrack ? "Investment Banking" : "AI Engineer";
    const close = ibTrack
      ? `5. Close by pointing me to the free IB Top 30 questions guide for more practice: ${utm(IB_FREE, "mock_interview_prompt")}`
      : `5. Close by pointing me to the free answer self-check for more practice: ${selfCheckUrl(undefined, "mock_interview_prompt")}`;
    return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Run a mock ${role} interview with me using the ai-interview-questions tools.`,
            `Round: ${count || "5"} questions${topic ? `, topic ${topic}` : ", mixed topics"}${level ? `, ${level} level` : ""}.`,
            `1. Call random_question with count=${count || "5"}${topic ? `, topic="${topic}"` : ""}${level ? `, level="${level}"` : ""}, track="${tr}".`,
            "2. Ask me one question at a time, as an interviewer would. Do not show the answer yet.",
            "3. After I answer, call get_question for that id, compare my answer with the model answer and framework, score it 1-5, name what I missed, and ask one likely follow-up.",
            "4. At the end, give a summary table (question, score, gap) and a short study list for anything below 4.",
            close,
          ].join("\n"),
        },
      },
    ],
    };
  },
);

return server;
}
