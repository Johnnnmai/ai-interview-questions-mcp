import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Level = "Entry" | "Mid" | "Senior";

export interface DeepDive {
  what_it_tests?: string;
  framework: string[];
  follow_ups: { q: string; a: string }[];
  common_mistakes: string[];
}

export interface Question {
  id: string;
  number: number;
  topic: string;
  topic_name: string;
  level: Level;
  question: string;
  answer: string;
  follow_up?: string;
  slug?: string;
  deep_dive?: DeepDive;
}

export interface Bank {
  source: string;
  publisher: string;
  updated: string;
  topics: { id: string; name: string }[];
  questions: Question[];
}

const here = dirname(fileURLToPath(import.meta.url));
export const bank: Bank = JSON.parse(readFileSync(join(here, "..", "data", "questions.json"), "utf8"));

export const SITE = "https://johnnnmai.github.io/ai-engineer-interview-questions/";
const CAMPAIGN = "line27_20261101";

export function utm(url: string, content: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=mcp&utm_medium=tool&utm_campaign=${CAMPAIGN}&utm_content=${encodeURIComponent(content)}`;
}

export function questionUrl(q: Question, content: string): string {
  return q.slug ? utm(`${SITE}questions/${q.slug}/`, content) : utm(SITE, content);
}

export function selfCheckUrl(q: Question | undefined, content: string): string {
  return q?.slug ? utm(`${SITE}answer-check/?q=${q.slug}`, content) : utm(`${SITE}answer-check/`, content);
}

export function footer(tool: string, q?: Question): string {
  return [
    "",
    "---",
    `Source: AI Engineer Interview Questions by Valenx Press, ${utm(SITE, tool)}`,
    `Free tools: answer self-check ${selfCheckUrl(q, tool)} · mock round timer ${utm(`${SITE}mock-interview/`, tool)} · study plan ${utm(`${SITE}study-plan/`, tool)}`,
  ].join("\n");
}

export function findQuestion(ref: string | number): Question | undefined {
  const s = String(ref).trim().toLowerCase();
  const n = /^\d+$/.test(s) ? Number(s) : /^aie-(\d+)$/.test(s) ? Number(s.slice(4)) : NaN;
  if (!Number.isNaN(n)) return bank.questions.find((q) => q.number === n);
  return bank.questions.find((q) => q.slug === s);
}

const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "what", "how", "do", "you", "with", "vs", "why", "does"]);

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/c\+\+/g, "cpp").split(/[^a-z0-9#]+/).filter((t) => t.length > 1 && !STOP.has(t));
}

export function search(query: string, topic?: string, level?: Level): { q: Question; score: number }[] {
  const terms = tokens(query);
  const phrase = query.trim().toLowerCase();
  const out: { q: Question; score: number }[] = [];
  for (const q of bank.questions) {
    if (topic && q.topic !== topic) continue;
    if (level && q.level !== level) continue;
    const qt = q.question.toLowerCase();
    const at = q.answer.toLowerCase();
    const tt = `${q.topic} ${q.topic_name} ${q.slug ?? ""}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (qt.includes(t)) score += 3;
      if (tt.includes(t)) score += 2;
      if (at.includes(t)) score += 1;
    }
    if (phrase.length > 3 && qt.includes(phrase)) score += 5;
    if (terms.length === 0) score = 0;
    if (score > 0) out.push({ q, score });
  }
  return out.sort((a, b) => b.score - a.score || a.q.number - b.q.number);
}

/** Small deterministic PRNG so a seed replays the same round. */
export function rng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
