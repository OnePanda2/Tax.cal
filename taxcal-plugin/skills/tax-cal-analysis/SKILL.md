---
name: tax-cal-analysis
description: Estimate, compare and explain personal tax on a salary with Tax.cal's deterministic tax engine — the UK, US, Canada, Australia, Ireland, Germany, France, the Netherlands, Spain, Italy and India (including India's new vs old regime for Tax Year 2026-27). Use when someone asks how much tax they pay or will pay, their take-home pay or effective tax rate, the VAT, GST or sales tax inside their spending, which Indian regime costs less on their numbers, or which rules and sources Tax.cal uses. Also use for indirect questions such as "So if I earn 15 lakh, what happens?" or "I live in Germany and earn €70k."
license: MIT
metadata:
  version: "1.0.0"
  website: "https://taxcal.siddheshthapa.com/"
---

# Tax.cal analysis

Tax.cal's MCP tools do every calculation with versioned rules drawn from official sources. Your job is to collect the inputs, call the right tool, and explain the result. **Never do tax arithmetic yourself**: no slab or bracket maths, rebates, cess or totals, and no adding up figures the tool did not return. If you need a different number, call the tool again with different inputs.

## Tools

| Tool | Use it for |
|---|---|
| `calculate_tax` | Tax on one salary in one country: income tax, social contributions, state, provincial or regional tax, take-home pay and an optional estimate of the tax inside spending |
| `compare_tax_regimes` | India only: new regime vs old regime side by side, plus the deductions at which they cost the same |
| `get_tax_rules` | What the rules, assumptions, sources and last-verified dates are. Without a country it returns an overview of all countries |
| `compare_countries` | The same salary across countries at dated, approximate exchange rates. This compares tax rules, not cost of living |

## Workflow

1. **Identify the jurisdiction.** Look for a country, a currency (₹, lakh and crore mean India; £ means the UK; € needs a country), a state or province, or earlier context in the conversation. Supported: UK (England, Wales, Northern Ireland; Scotland is not supported), US (all states + DC), Canada (all provinces and territories), Australia, Ireland, Germany, France, the Netherlands, Spain, Italy and India.
2. **Identify the tax year.** If the user names none, omit `tax_year`: the tool uses the current year and reports it. If they name one, pass their wording (for example `"FY 2026-27"` or `"AY 2026-27"`). The tool maps it and adds a note. See [India's tax years](#indias-tax-years).
3. **Classify the request:** a calculation (`calculate_tax`), an India regime comparison (`compare_tax_regimes`), a cross-country comparison (`compare_countries`), a question about rules, assumptions or sources (`get_tax_rules`), or planning information (see step 11).
4. **Ask only for missing material inputs, in one short question.** These are material:
   - The annual gross salary. Convert monthly pay to annual and lakh or crore to digits: ₹15 lakh = `1500000`, ₹1.2 crore = `12000000`.
   - **US**: the state (`region`, for example `"NY"`) and the filing status (`"single"` or `"married_filing_jointly"`). Never assume either.
   - **Canada**: the province (`region`, for example `"ON"`).
   - Everything else has a reported default. These are the UK region, India's regime, residency and age, Germany's children flag and the spending profile. Do not ask about them up front: run the calculation, then mention the defaults that matter.
5. **Call the tool** with exactly the inputs you have. Use `old_regime_deductions` only for amounts the user gave. Never invent deductions, spending or ages.
6. **Do not calculate independently.** Quote the tool's figures. If the tool returns an error, follow [Errors](#errors) and do not fill the gap with your own estimate.
7. **Explain the result clearly.** Lead with the estimated tax, the effective rate and the take-home pay (annual and monthly), then the breakdown. Use the currency the tool returns.
8. **Keep direct and indirect tax separate.** Income tax, social contributions and regional tax are calculated from the rules. Tax inside spending (`indirect_tax_estimate`) is an estimate from a spending profile. Say which profile was used (`basis`) and never present the two as one exact number.
9. **Show the assumptions that matter.** Report every `defaults_applied` entry with `material: true`, the tax year label and the most relevant assumptions and exclusions. Report each part's confidence separately (`direct_tax`, `social_contributions`, `regional_tax`, `indirect_tax`), never as a single score.
10. **Cite the rule metadata the tool returns:** `rule_version`, `last_verified`, and one or two of the `sources` (title and publisher, with the URL when present).
11. **Avoid overclaiming.** Do not call a figure exact, official, guaranteed or a recommendation. For India, report which regime gives the lower estimated tax on these inputs. Never say one regime is "better". For planning questions, describe the levers the result shows, such as the deductions needed to break even in India, as possibilities that depend on eligibility, not as advice or promised savings.
12. **Redirect what is out of scope.** This includes business, freelance, rental or investment income, capital gains, foreign income or assets, companies, HUFs, firms and trusts, filing returns, paying tax, TDS/GST filings, and anything needing judgement about someone's affairs. Say Tax.cal does not cover it and point to the tax authority or a qualified professional. Do not attempt it with the tools.

## India's tax years

The Income-tax Act, 2025 applies from 1 April 2026 and replaces "previous year" and "assessment year" with a single **tax year**.

| The user says | Pass | Meaning |
|---|---|---|
| "FY 2026-27", "2026-27", "Tax Year 2026-27", "this year" | `"FY 2026-27"` or omit | Tax Year 2026-27 (1 April 2026 – 31 March 2027), Income-tax Act, 2025 |
| "AY 2026-27", "FY 2025-26", "last year" | `"AY 2026-27"` / `"FY 2025-26"` | Income earned 1 April 2025 – 31 March 2026, assessed in AY 2026-27 under the Income-tax Act, 1961 (legacy) |
| "AY 2027-28" | `"AY 2027-28"` | There is no AY 2027-28 under the new Act. The tool treats this as Tax Year 2026-27 and says so |

Do not turn every Indian year into an assessment year. For salaried individuals, the two supported years use the same slabs, rebate, surcharge and cess in Tax.cal, so an ambiguous year (for example "2026") does not change the numbers. Use Tax Year 2026-27 and mention the terminology. Ask only if the user needs the legal framework itself, such as section numbers or which return form applies.

More detail: [references/india.md](references/india.md).

## Answer format

Keep it compact. A good structure:

```
Estimated tax: ₹97,500 a year (₹8,125 a month)
Effective rate: 6.5% of gross
Take-home pay: ₹14,02,500 a year (₹1,16,875 a month)

Breakdown: [lines from `breakdown`]
Assumptions: [material defaults and key assumptions]
Confidence: direct tax high; tax inside spending low (typical spending profile)
Rules: Tax Year 2026-27, IN-2026-27-v1, last verified [date]. Source: [title, publisher]

Tax.cal provides the calculation engine and methodology. Explore the full interactive calculator on Tax.cal: [learn_more.url]
```

Include at most **one** link to Tax.cal per answer (the `learn_more` link) and leave it out of short follow-ups. The answer must be complete without the link.

Examples of requests to tool calls: [references/examples.md](references/examples.md). Per-country inputs and caveats: [references/countries.md](references/countries.md).

## Errors

Each error result starts with a sentence you can relay, followed by a JSON `error` with a `code`.

| Code | What to do |
|---|---|
| `missing_input` | Ask for exactly the named `field`, for example *"I need your filing status to calculate this accurately."* |
| `unsupported_country`, `unsupported_region`, `unsupported_tax_year` | Say what is supported (the message lists it). Do not estimate the unsupported case yourself |
| `unsupported_scope` | Explain that Tax.cal covers salaried individual income only, and point to the tax authority or a professional |
| `invalid_input`, `out_of_range` | Fix an obvious formatting slip yourself, such as lakh to digits or monthly to annual, and retry once. Otherwise ask the user |

## What Tax.cal will not do

Tax.cal calculates and explains. It cannot file returns, submit forms, make payments, contact a tax authority or guarantee an outcome. If asked, say so plainly and offer what it can do, such as an estimate of the tax due.
