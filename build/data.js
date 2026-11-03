import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
export const TRACKS = ["ai-engineer", "investment-banking"];
const here = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(here, "..", "data", f), "utf8"));
const aie = load("questions.json");
const ib = load("ib-questions.json");
for (const q of aie.questions)
    q.track = "ai-engineer";
for (const q of ib.questions)
    q.track = "investment-banking";
/** 100 AI Engineer questions (aie-001..aie-100) plus 100 Investment Banking questions (ib-001..ib-100). */
export const bank = {
    ...aie,
    topics: [...aie.topics, ...ib.topics],
    questions: [...aie.questions, ...ib.questions],
};
export const counts = { "ai-engineer": aie.questions.length, "investment-banking": ib.questions.length };
export const SITE = "https://johnnnmai.github.io/ai-engineer-interview-questions/";
/** IB results link only to this free guide. */
export const IB_FREE = "https://sirjohnnymai.gumroad.com/l/ib-top-30-questions";
const CAMPAIGN = "line27_20261101";
export function utm(url, content) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}utm_source=mcp&utm_medium=tool&utm_campaign=${CAMPAIGN}&utm_content=${encodeURIComponent(content)}`;
}
export function questionUrl(q, content) {
    if (q.track === "investment-banking")
        return utm(IB_FREE, content);
    return q.slug ? utm(`${SITE}questions/${q.slug}/`, content) : utm(SITE, content);
}
export function selfCheckUrl(q, content) {
    return q?.slug ? utm(`${SITE}answer-check/?q=${q.slug}`, content) : utm(`${SITE}answer-check/`, content);
}
const ibLine = (tool) => `Free: Investment Banking Top 30 questions with model answers by Valenx Press, ${utm(IB_FREE, tool)}`;
/**
 * Source footer. `tracks` says which banks the result drew from (default both).
 * IB-only results link only to the free IB Top 30 guide.
 */
export function footer(tool, q, tracks) {
    const ts = q ? [q.track] : tracks?.length ? tracks : [...TRACKS];
    const out = ["", "---"];
    if (ts.includes("ai-engineer")) {
        const aq = q?.track === "ai-engineer" ? q : undefined;
        out.push(`Source: AI Engineer Interview Questions by Valenx Press, ${utm(SITE, tool)}`, `Free tools: answer self-check ${selfCheckUrl(aq, tool)} · mock round timer ${utm(`${SITE}mock-interview/`, tool)} · study plan ${utm(`${SITE}study-plan/`, tool)}`);
    }
    if (ts.includes("investment-banking"))
        out.push(ibLine(tool));
    return out.join("\n");
}
export const tracksOf = (qs) => [...new Set(qs.map((q) => q.track))];
export function findQuestion(ref) {
    const s = String(ref).trim().toLowerCase();
    const ibm = /^ib-?(\d+)$/.exec(s);
    if (ibm)
        return bank.questions.find((q) => q.track === "investment-banking" && q.number === Number(ibm[1]));
    const n = /^\d+$/.test(s) ? Number(s) : /^aie-(\d+)$/.test(s) ? Number(s.slice(4)) : NaN;
    if (!Number.isNaN(n))
        return bank.questions.find((q) => q.track === "ai-engineer" && q.number === n);
    return bank.questions.find((q) => q.slug === s);
}
const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "what", "how", "do", "you", "with", "vs", "why", "does"]);
function tokens(s) {
    return s.toLowerCase().replace(/c\+\+/g, "cpp").split(/[^a-z0-9#]+/).filter((t) => t.length > 1 && !STOP.has(t));
}
export function search(query, topic, level, track) {
    const terms = tokens(query);
    const phrase = query.trim().toLowerCase();
    const out = [];
    for (const q of bank.questions) {
        if (topic && q.topic !== topic)
            continue;
        if (level && q.level !== level)
            continue;
        if (track && q.track !== track)
            continue;
        const qt = q.question.toLowerCase();
        const at = q.answer.toLowerCase();
        const tt = `${q.topic} ${q.topic_name} ${q.subtopic ?? ""} ${q.slug ?? ""}`.toLowerCase();
        let score = 0;
        for (const t of terms) {
            if (qt.includes(t))
                score += 3;
            if (tt.includes(t))
                score += 2;
            if (at.includes(t))
                score += 1;
        }
        if (phrase.length > 3 && qt.includes(phrase))
            score += 5;
        if (terms.length === 0)
            score = 0;
        if (score > 0)
            out.push({ q, score });
    }
    return out.sort((a, b) => b.score - a.score || a.q.track.localeCompare(b.q.track) || a.q.number - b.q.number);
}
/** Small deterministic PRNG so a seed replays the same round. */
export function rng(seed) {
    if (seed === undefined)
        return Math.random;
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
