# AI Interview Questions MCP

[![npm](https://img.shields.io/npm/v/ai-interview-questions-mcp)](https://www.npmjs.com/package/ai-interview-questions-mcp) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An MCP server that brings **100 graded AI Engineer interview questions with model answers** into Claude, Cursor, VS Code, or any MCP client. Practice LLM fundamentals, prompting, RAG, agents and MCP, fine-tuning, evaluation, AI system design, production and coding questions, then run a mock interview with your assistant.

- 100 questions, each graded **Entry / Mid / Senior**, with a model answer
- 50 deep dives with an answer framework, likely follow-ups and common mistakes
- Runs offline over stdio. No API keys, no account, no network calls, no telemetry

Questions come from the free [AI Engineer Interview Questions](https://johnnnmai.github.io/ai-engineer-interview-questions/?utm_source=mcp&utm_medium=readme&utm_campaign=line27_20261101) bank by Valenx Press.

## Try it

Ask your assistant:

- "Give me a 5-question Senior mock interview on RAG, one question at a time."
- "Search the interview questions for KV cache and show me the model answer."
- "Quiz me on agents, then score my answer to aie-041 from 1 to 5."

## Tools

| Tool | What it does |
|---|---|
| `list_topics` | The 9 topics with question counts per level |
| `search_questions` | Keyword search over questions and answers. Filters: `topic`, `level`, `limit` |
| `get_question` | One question by id (`aie-026`), number (`26`) or slug (`what-is-rag`): model answer, framework, follow-ups, common mistakes. `include_answer=false` hides the answer for practice |
| `random_question` | 1 to 10 random questions with answers hidden. Filters: `topic`, `level`; `seed` replays the same set |

All tools are read-only.

**Prompt:** `mock_interview` (args: `topic`, `level`, `count`) runs a full round: one question at a time, a 1 to 5 score against the model answer, a follow-up, and a study list at the end.

**Resources:** `aiq://topics` and `aiq://question/{id}` (for example `aiq://question/aie-003`).

Topics: `llm-fundamentals`, `prompting`, `rag`, `agents`, `fine-tuning`, `evaluation`, `system-design`, `production`, `coding`.

## Install

Requires Node.js 18 or newer.

### Claude Code

```bash
claude mcp add ai-interview-questions -- npx -y ai-interview-questions-mcp
```

Or install it as a plugin, which also adds a `mock-interview` skill:

```text
/plugin marketplace add Johnnnmai/ai-interview-questions-mcp
/plugin install ai-interview-questions@valenx-press
```

### Claude Desktop

Settings > Developer > Edit Config, then add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-interview-questions": {
      "command": "npx",
      "args": ["-y", "ai-interview-questions-mcp"]
    }
  }
}
```

Restart Claude Desktop. You can also download `ai-interview-questions-mcp.mcpb` from the [latest release](https://github.com/Johnnnmai/ai-interview-questions-mcp/releases/latest) and open it to install with one click.

### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "ai-interview-questions": {
      "command": "npx",
      "args": ["-y", "ai-interview-questions-mcp"]
    }
  }
}
```

### VS Code

```bash
code --add-mcp '{"name":"ai-interview-questions","command":"npx","args":["-y","ai-interview-questions-mcp"]}'
```

### Windows

If `npx` is not found, use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "ai-interview-questions-mcp"]`.

### From source

```bash
git clone https://github.com/Johnnnmai/ai-interview-questions-mcp
cd ai-interview-questions-mcp
npm install && npm run build && npm test
```

Then point your client at `node /path/to/ai-interview-questions-mcp/build/index.js`.

## Free tools that pair with it

- [Answer self-check](https://johnnnmai.github.io/ai-engineer-interview-questions/answer-check/?utm_source=mcp&utm_medium=readme&utm_campaign=line27_20261101): paste an answer, get a rubric score in the browser
- [Mock round timer](https://johnnnmai.github.io/ai-engineer-interview-questions/mock-interview/?utm_source=mcp&utm_medium=readme&utm_campaign=line27_20261101)
- [Study plan](https://johnnnmai.github.io/ai-engineer-interview-questions/study-plan/?utm_source=mcp&utm_medium=readme&utm_campaign=line27_20261101): a day-by-day plan up to your interview date
- [LLM API cost calculator](https://johnnnmai.github.io/ai-engineer-interview-questions/llm-cost-calculator/?utm_source=mcp&utm_medium=readme&utm_campaign=line27_20261101)

Every tool result ends with a short source line and these links, tagged `utm_source=mcp` so the site can see visits from this server. Nothing else is tracked. See [PRIVACY.md](PRIVACY.md).

## Development

```bash
npm install
npm run build        # compile src/ to build/
npm test             # stdio client calls every tool, prompt and resource
npx @modelcontextprotocol/inspector node build/index.js
```

`data/questions.json` is generated from the public files of the [question bank repo](https://github.com/Johnnnmai/ai-engineer-interview-questions) with `scripts/build_data.py`.

The content is educational interview practice, not a record of questions asked by any specific employer. Corrections are welcome via issues.

## License

MIT © 2026 Valenx Press
