import React, { useState } from 'react';
import { Plus, X, Trash2, Ban, CheckCircle2, XCircle, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ProdRules,
  ProdRuleOp,
  PROD_RULES_MAX_RULES,
  PROD_RULES_MAX_WORDS,
  normalizeProdWord,
  testProdRules,
  describeProdRules,
} from '@/utils/prodRules';

// Editor for a prod-match ad's rules (serveStrategy 9, V2 only). Rules are
// groups of words; each group needs ALL or ANY of its words, and the groups
// combine with ALL or ANY. Optional excluded words veto a match. The tester at
// the bottom runs the same matching the serve API does.

const inputClass =
  'bg-[var(--h-surface)] border-[var(--h-line)] focus:border-[var(--h-line-accent)] focus:ring-4 focus:ring-[color-mix(in srgb, var(--h-iris-500) 10%, transparent)] transition-all duration-200';

const OpToggle: React.FC<{
  value: ProdRuleOp;
  onChange: (op: ProdRuleOp) => void;
  allLabel: string;
  anyLabel: string;
}> = ({ value, onChange, allLabel, anyLabel }) => (
  <div className="inline-flex rounded-lg border border-[var(--h-line)] bg-[var(--h-surface-2)] p-0.5">
    {([['and', allLabel], ['or', anyLabel]] as const).map(([op, label]) => (
      <button
        key={op}
        type="button"
        onClick={() => onChange(op)}
        className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
          value === op
            ? 'bg-[var(--h-surface)] text-[var(--h-iris-500)] shadow-sm'
            : 'text-[var(--h-ink-3)] hover:text-[var(--h-ink-2)]'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

// Chips + an input that adds a word on Enter / comma / Add. Words are stored
// the way the API stores them (lower-case, punctuation → space), so the chip
// shows what will actually be matched.
const WordInput: React.FC<{
  words: string[];
  onChange: (words: string[]) => void;
  placeholder: string;
  tone?: 'iris' | 'coral';
}> = ({ words, onChange, placeholder, tone = 'iris' }) => {
  const [text, setText] = useState('');

  const add = () => {
    const parts = text.split(',').map(normalizeProdWord).filter(Boolean);
    if (!parts.length) { setText(''); return; }
    const next = [...words];
    for (const w of parts) {
      if (next.includes(w)) continue;
      if (next.length >= PROD_RULES_MAX_WORDS) {
        toast.error(`Maximum ${PROD_RULES_MAX_WORDS} words`);
        break;
      }
      next.push(w);
    }
    onChange(next);
    setText('');
  };

  const chip = tone === 'coral'
    ? 'border-[color-mix(in srgb, var(--h-coral) 40%, transparent)] bg-[color-mix(in srgb, var(--h-coral) 10%, transparent)] text-[var(--h-coral)]'
    : 'border-[var(--h-line-accent)] bg-[var(--h-tint)] text-[var(--h-iris-700)]';

  return (
    <div>
      {words.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {words.map((w) => (
            <span key={w} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${chip}`}>
              {w}
              <button
                type="button"
                aria-label={`Remove ${w}`}
                onClick={() => onChange(words.filter((x) => x !== w))}
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <Button type="button" variant="outline" onClick={add}>Add</Button>
      </div>
    </div>
  );
};

interface ProdRulesBuilderProps {
  value: ProdRules;
  onChange: (rules: ProdRules) => void;
}

export const ProdRulesBuilder: React.FC<ProdRulesBuilderProps> = ({ value, onChange }) => {
  const [sample, setSample] = useState('');

  const setRule = (i: number, patch: Partial<ProdRules['rules'][number]>) =>
    onChange({ ...value, rules: value.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  const addRule = () => {
    if (value.rules.length >= PROD_RULES_MAX_RULES) {
      toast.error(`Maximum ${PROD_RULES_MAX_RULES} rules`);
      return;
    }
    onChange({ ...value, rules: [...value.rules, { op: 'and', words: [] }] });
  };

  const removeRule = (i: number) => {
    const rules = value.rules.filter((_, j) => j !== i);
    onChange({ ...value, rules: rules.length ? rules : [{ op: 'and', words: [] }] });
  };

  const result = sample.trim() ? testProdRules(value, sample) : null;

  return (
    <div className="space-y-3">
      {value.rules.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--h-ink-2)]">
          <span>Serve when the product name matches</span>
          <OpToggle
            value={value.op}
            onChange={(op) => onChange({ ...value, op })}
            allLabel="all rules"
            anyLabel="any rule"
          />
        </div>
      )}

      {value.rules.map((rule, i) => {
        const hit = result?.ruleHits[i];
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-[var(--h-line)]" />
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--h-iris-500)]">
                  {value.op === 'and' ? 'and' : 'or'}
                </span>
                <div className="h-px flex-1 bg-[var(--h-line)]" />
              </div>
            )}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                result && rule.words.length
                  ? hit
                    ? 'border-[color-mix(in srgb, var(--h-mint) 50%, transparent)] bg-[var(--h-mint-soft)]'
                    : 'border-[var(--h-line)] bg-[var(--h-surface)]'
                  : 'border-[var(--h-line)] bg-[var(--h-surface)]'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--h-ink-2)]">
                  <span className="font-semibold">Rule {i + 1}</span>
                  <span className="text-[var(--h-ink-3)]">— name contains</span>
                  <OpToggle
                    value={rule.op}
                    onChange={(op) => setRule(i, { op })}
                    allLabel="all of"
                    anyLabel="any of"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="text-[var(--h-ink-3)] hover:text-[var(--h-coral)]"
                  aria-label={`Remove rule ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <WordInput
                words={rule.words}
                onChange={(words) => setRule(i, { words })}
                placeholder='Word or phrase, e.g. iphone or "galaxy s24" — Enter to add'
              />
            </div>
          </React.Fragment>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addRule} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add rule
      </Button>

      <div className="rounded-xl border border-[var(--h-line)] bg-[var(--h-surface)] p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--h-ink-2)]">
          <Ban className="h-3.5 w-3.5 text-[var(--h-coral)]" />
          Never serve when the name contains <span className="font-normal text-[var(--h-ink-3)]">(optional)</span>
        </div>
        <WordInput
          words={value.exclude}
          onChange={(exclude) => onChange({ ...value, exclude })}
          placeholder="e.g. case, cover, refurbished"
          tone="coral"
        />
      </div>

      <div className="rounded-xl border border-[var(--h-line-accent)] bg-[var(--h-tint)] p-3 space-y-2">
        <div className="text-[12px] text-[var(--h-ink-2)]">
          <span className="font-semibold">Serves when: </span>
          <span className="font-mono text-[11.5px]">{describeProdRules(value)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--h-ink-2)]">
          <FlaskConical className="h-3.5 w-3.5 text-[var(--h-iris-500)]" /> Test a product name
        </div>
        <Input
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          placeholder="Paste a product name, e.g. Apple iPhone 15 (128 GB) - Black"
          className={inputClass}
        />
        {result && (
          <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${result.matched ? 'text-[var(--h-mint)]' : 'text-[var(--h-coral)]'}`}>
            {result.matched
              ? <><CheckCircle2 className="h-4 w-4" /> Matches — this ad can serve on that product</>
              : <><XCircle className="h-4 w-4" /> No match{result.excludedBy ? ` — blocked by "${result.excludedBy}"` : ''}</>}
          </div>
        )}
        <p className="text-[11px] leading-snug text-[var(--h-ink-3)]">
          Whole words, case-insensitive: <span className="font-mono">15</span> matches "iPhone-15" but not "150";
          a phrase like <span className="font-mono">iphone 15 pro</span> must appear in that order.
        </p>
      </div>
    </div>
  );
};

export default ProdRulesBuilder;
