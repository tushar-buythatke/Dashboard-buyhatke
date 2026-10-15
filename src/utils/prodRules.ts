// Prod-match ads (serveStrategy 9, V2 only) — the ad's `prodRules`, matched by the
// serve API against the product name on the page.
//
// This mirrors the PROD RULES section of utils/adCacheUtil.js in buyhatke-ads /
// buyhatkeAddDashboard, so the form shows exactly what the API will store and
// the "test a product name" box gives the same answer serving will.
//
//   { op: 'or', rules: [{ op: 'and', words: ['iphone', '15'] }], exclude: ['case'] }
//
// Words match whole and case-insensitive; punctuation counts as a space; a word
// with a space is a phrase.

export type ProdRuleOp = 'and' | 'or';

export interface ProdRule {
  op: ProdRuleOp;
  words: string[];
}

export interface ProdRules {
  op: ProdRuleOp;
  rules: ProdRule[];
  exclude: string[];
}

export const PROD_MATCH_SERVE_STRATEGY = 9;
export const PROD_RULES_MAX_RULES = 20;
export const PROD_RULES_MAX_WORDS = 50;
export const PROD_RULES_MAX_WORD_LENGTH = 100;

export const emptyProdRules = (): ProdRules => ({
  op: 'or',
  rules: [{ op: 'and', words: [] }],
  exclude: [],
});

export const normalizeProdText = (s: unknown): string =>
  String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const normalizeProdWord = (w: unknown): string =>
  normalizeProdText(String(w ?? '').slice(0, PROD_RULES_MAX_WORD_LENGTH));

const asOp = (v: unknown, fallback: ProdRuleOp): ProdRuleOp =>
  String(v ?? '').toLowerCase() === 'and' ? 'and' : String(v ?? '').toLowerCase() === 'or' ? 'or' : fallback;

const asWords = (v: unknown): string[] => {
  const out: string[] = [];
  for (const w of Array.isArray(v) ? v : []) {
    const word = normalizeProdWord(w);
    if (word && !out.includes(word)) out.push(word);
  }
  return out;
};

// Whatever the API returned (object, JSON string, null) → an editable rule set.
// An ad with no rules gets one empty rule to type into.
export function toFormProdRules(raw: unknown): ProdRules {
  let v: any = raw;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { v = null; }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return emptyProdRules();
  if (!Array.isArray(v.rules) && Array.isArray(v.words)) v = { rules: [v] };
  const rules: ProdRule[] = (Array.isArray(v.rules) ? v.rules : [])
    .filter((r: any) => r && typeof r === 'object')
    .map((r: any) => ({ op: asOp(r.op, 'and'), words: asWords(r.words) }));
  return {
    op: asOp(v.op, 'or'),
    rules: rules.length ? rules : [{ op: 'and', words: [] }],
    exclude: asWords(v.exclude),
  };
}

// The form's rule set → the body the API takes. Rules still empty are dropped;
// null when nothing is left.
export function toApiProdRules(rules: ProdRules | null | undefined): ProdRules | null {
  if (!rules) return null;
  const kept = rules.rules.filter((r) => r.words.length > 0);
  if (!kept.length) return null;
  return { op: rules.op, rules: kept, exclude: rules.exclude };
}

// Why this rule set cannot be saved for a prod-match ad, or null when it can.
export function prodRulesError(rules: ProdRules | null | undefined): string | null {
  const api = toApiProdRules(rules);
  if (!api) return 'Prod-match ads need at least one rule with a word, or they never serve.';
  if (api.rules.length > PROD_RULES_MAX_RULES) return `At most ${PROD_RULES_MAX_RULES} rules.`;
  if (api.rules.some((r) => r.words.length > PROD_RULES_MAX_WORDS)) return `At most ${PROD_RULES_MAX_WORDS} words per rule.`;
  if (api.exclude.length > PROD_RULES_MAX_WORDS) return `At most ${PROD_RULES_MAX_WORDS} excluded words.`;
  return null;
}

export interface ProdMatchResult {
  matched: boolean;
  excludedBy: string | null;   // the exclude word that blocked it
  ruleHits: boolean[];         // per rule (empty rules count as no hit)
}

// Same answer as matchProdRules on the server, plus which part decided it.
export function testProdRules(rules: ProdRules, productName: string): ProdMatchResult {
  const t = normalizeProdText(productName);
  const index = t ? ` ${t} ` : '';
  const has = (w: string) => !!index && index.includes(` ${w} `);
  const ruleHits = rules.rules.map((r) =>
    r.words.length > 0 && (r.op === 'and' ? r.words.every(has) : r.words.some(has)));
  const excludedBy = rules.exclude.find(has) ?? null;
  const live = rules.rules.map((r, i) => ({ r, hit: ruleHits[i] })).filter(({ r }) => r.words.length > 0);
  const rulesOk = live.length > 0 && (rules.op === 'and' ? live.every((x) => x.hit) : live.some((x) => x.hit));
  return { matched: !!index && !excludedBy && rulesOk, excludedBy, ruleHits };
}

// One line a person can read back: (iphone AND 15) OR (pixel 9), not: case.
export function describeProdRules(rules: ProdRules | null | undefined): string {
  const api = toApiProdRules(rules);
  if (!api) return 'No rules';
  const join = (op: ProdRuleOp) => (op === 'and' ? ' AND ' : ' OR ');
  const quote = (w: string) => (w.includes(' ') ? `"${w}"` : w);
  const parts = api.rules.map((r) => {
    const s = r.words.map(quote).join(join(r.op));
    return r.words.length > 1 && api.rules.length > 1 ? `(${s})` : s;
  });
  let out = parts.join(join(api.op));
  if (api.exclude.length) out += ` — never: ${api.exclude.map(quote).join(', ')}`;
  return out;
}
