#!/usr/bin/env node
/* Generate docs/TAX_RULE_SOURCES.md from the rule data in packages/tax-core,
   so the published list of sources, versions, assumptions and exclusions is
   always the one the engine actually uses. tests/site.test.mjs fails if the
   file is stale (run `npm run build:docs`). */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ORDER, COUNTRIES, CATEGORIES, FX, ENGINE_VERSION } from '../packages/tax-core/src/index.js';

export const OUT = fileURLToPath(new URL('../docs/TAX_RULE_SOURCES.md', import.meta.url));

const CONF = { high: 'high', medium: 'medium', med: 'medium', low: 'low', not_applicable: 'n/a' };
const pct = (x) => (x == null ? '—' : `${(x * 100).toFixed(x * 100 < 10 ? 2 : 1)}%`);
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const link = (s) => (s.url ? `[${esc(s.title)}](${s.url})` : esc(s.title));

function ruleSet(k, year) {
  const e = COUNTRIES[k];
  const R = e.rules[year];
  const c = R.confidence;
  const out = [];
  out.push(`### ${e.profile.name}: ${R.taxYearLabel}`);
  out.push('');
  out.push(`- **Rule version:** \`${R.ruleVersion}\` (${R.status}) · **Last verified:** ${R.lastVerified}`);
  out.push(`- **Effective:** ${R.period.start} to ${R.period.end}`);
  out.push(`- **Legal basis:** ${R.legalBasis}`);
  if (k === 'IN') out.push(`- **Regimes:** new regime (${R.sections.newRegime}, the default) and old regime (opt-in); rebate ${R.sections.rebate}; standard deduction ${R.sections.standardDeduction}`);
  out.push(`- **Confidence:** direct tax ${CONF[c.direct_tax]} · social contributions ${CONF[c.social_contributions]} · regional tax ${CONF[c.regional_tax]} · indirect tax ${CONF[c.indirect_tax]}`);
  out.push('');
  out.push('| Source | Publisher | Rule supported |');
  out.push('|---|---|---|');
  for (const s of R.sources) out.push(`| ${link(s)} | ${esc(s.publisher)} | ${esc(s.covers || '')} |`);
  out.push('');
  out.push('**Assumptions**');
  out.push('');
  for (const a of R.assumptions) out.push(`- ${a}`);
  out.push('');
  out.push('**Not included**');
  out.push('');
  for (const x of R.exclusions) out.push(`- ${x}`);
  out.push('');
  const I = R.indirectTax;
  out.push(`**Indirect tax (estimate): ${I.name}${I.standardRate ? `, standard rate ${pct(I.standardRate)}` : ''}**`);
  out.push('');
  out.push('| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |');
  out.push('|---|---|---|---|---|');
  for (const cat of CATEGORIES) {
    const r = I.categories[cat.id];
    const share = r.effectiveRate != null ? pct(r.effectiveRate) : r.taxableShare != null ? `${pct(r.taxableShare)} of spend × regional rate` : '—';
    out.push(`| ${cat.label} | ${share} | ${pct(r.nominalRate)} | ${CONF[r.confidence] || r.confidence} | ${esc(r.reason)} |`);
  }
  out.push('');
  return out.join('\n');
}

export function render() {
  const lines = [];
  lines.push('# Tax rule sources');
  lines.push('');
  lines.push('> Generated from `packages/tax-core/src/rules/*.js` by `npm run build:docs`. Do not edit by hand. Change the rule data, then regenerate.');
  lines.push('');
  lines.push(`Every figure Tax.cal shows, on the website or in ChatGPT, comes from the rule sets below (engine ${ENGINE_VERSION}). Each rule set has a version, a status, its tax-year period and the date its sources were last checked. Each result carries that version so it can be traced back here. Sources are official publications where one exists. Where a rule set rests on a secondary compilation or on Tax.cal's own assumption, the table says so.`);
  lines.push('');
  lines.push('| Country | Tax year | Effective | Rule version | Status | Last verified | Direct tax confidence |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const k of ORDER) {
    for (const y of Object.keys(COUNTRIES[k].rules)) {
      const R = COUNTRIES[k].rules[y];
      lines.push(`| ${COUNTRIES[k].profile.name} | ${y} | ${R.period.start} – ${R.period.end} | \`${R.ruleVersion}\` | ${R.status} | ${R.lastVerified} | ${CONF[R.confidence.direct_tax]} |`);
    }
  }
  lines.push('');
  lines.push('**How to read the confidence labels.** *High*: the statutory schedule is applied directly for the stated taxpayer profile. *Medium*: the law is applied, but simplified for the profile, for example a representative region or a credit approximated by its formula. *Low*: a proxy or an estimate, for example US state tax outside California, or the tax inside spending. *n/a*: the country has no such tax in Tax.cal\'s model.');
  lines.push('');
  lines.push('**What is never covered:** self-employment, business, rental and investment income; capital gains; companies, partnerships, trusts, Indian HUFs and firms; filing returns or paying tax; local and city income taxes; personal advice.');
  lines.push('');
  lines.push('## Exchange rates (comparisons only)');
  lines.push('');
  lines.push(`[${FX.source.title}](${FX.source.url}), ${FX.source.publisher}. Units per 1 ${FX.base}: ${Object.entries(FX.perEUR).map(([c, v]) => `${c} ${v}`).join(', ')}. ${FX.note}`);
  lines.push('');
  lines.push('## Typical spending profile (Tax.cal assumption)');
  lines.push('');
  lines.push('Used for the indirect-tax estimate when someone gives no spending. Each figure is monthly spend as a share of monthly gross pay. It is an internal assumption, reported as a default wherever it is applied.');
  lines.push('');
  lines.push('| Category | Share of monthly gross pay |');
  lines.push('|---|---|');
  for (const c of CATEGORIES) lines.push(`| ${c.label} | ${pct(c.def)} |`);
  lines.push('');
  lines.push('## Rule sets');
  lines.push('');
  for (const k of ORDER) for (const y of Object.keys(COUNTRIES[k].rules)) lines.push(ruleSet(k, y));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
  writeFileSync(OUT, render());
  console.log('Wrote docs/TAX_RULE_SOURCES.md');
}
