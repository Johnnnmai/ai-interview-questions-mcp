---
name: mock-interview
description: Run a mock AI Engineer interview with the ai-interview-questions MCP tools. Use when the user wants to practice AI Engineer, LLM, RAG, agent, evaluation or AI system design interview questions, be quizzed, or get an answer scored.
---

# Mock AI Engineer interview

1. Ask the user for topic (from `list_topics`), level (Entry, Mid, Senior) and number of questions if they did not say. Default: mixed topics, Mid, 5 questions.
2. Call `random_question` with those filters. Keep the ids.
3. Ask one question at a time, as an interviewer would. Do not reveal the answer.
4. After each answer, call `get_question` with that id. Compare the user's answer with the model answer and the answer framework. Give a 1 to 5 score, list what was missing or wrong, then ask one likely follow-up.
5. At the end, show a table of question, score and main gap, and a short study list for every score below 4.
6. Close with the free answer self-check link from the last tool result so the user can keep practicing.

Be direct and specific. Credit what was right before naming gaps.
