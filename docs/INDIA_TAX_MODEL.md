# India tax model

How Tax.cal calculates Indian income tax on a salary. It covers the law it follows, the order of the computation, what is in and out of scope, how the indirect-tax estimate works, and how the model is tested. Every number lives in `packages/tax-core/src/rules/in.js` and the arithmetic in `packages/tax-core/src/calc/in.js`. The website, the country page and the ChatGPT tools all call the same code.

## 1. Two rule sets that must never be mixed

| Rule set | Key | Law | Period | Status |
|---|---|---|---|---|
| `IN-2026-27-v1` | `2026-27` | Income-tax Act, 2025 as amended by the Finance Act, 2026 | 1 Apr 2026 – 31 Mar 2027 | current, the default |
| `IN-2025-26-legacy-v1` | `2025-26` | Income-tax Act, 1961 as amended by the Finance Act, 2025 | 1 Apr 2025 – 31 Mar 2026 (assessed in AY 2026-27) | legacy |

The Income-tax Act, 2025 applies from 1 April 2026 and replaces "previous year" and "assessment year" with one **tax year**. Income earned in FY 2025-26 is still assessed in **AY 2026-27 under the 1961 Act**. That is a separate obligation from **Tax Year 2026-27**, even though both labels contain "2026-27" (Income Tax Department, *FAQs on Interplay and Transition to the Income-tax Act, 2025*).

The amounts are identical in both years, because Budget 2026 changed no personal rates. The law, the section numbers and the terminology differ, so results always state which applies (`tax_year_label`, `legal_basis`).

| User says | Rule set | Note returned |
|---|---|---|
| nothing, `2026-27`, `TY 2026-27`, `Tax Year 2026-27` | 2026-27 | — |
| `FY 2026-27` | 2026-27 | "FY 2026-27 is Tax Year 2026-27 under the Income-tax Act, 2025…" |
| `AY 2027-28` | 2026-27 | "There is no AY 2027-28 under the Income-tax Act, 2025…" |
| `2025-26`, `FY 2025-26`, `AY 2026-27` | 2025-26 | names the 1961 Act and AY 2026-27 |
| anything else (`2026`, `2024-25`…) | — | `unsupported_tax_year` listing both supported years |

## 2. Computation order

For one regime (`regimeFromSalary` → `regimeTax`):

1. **Standard deduction** from salary: ₹75,000 in the new regime (§19 read with §202; §16(ia) in the 1961 Act), ₹50,000 in the old.
2. **Old-regime deductions** (old regime only), each capped at its limit: 80C/§123 ₹1,50,000 · 80CCD(1B) ₹50,000 · 80D/§126 ₹1,00,000 (the overall ceiling; the actual limit depends on ages) · self-occupied home-loan interest ₹2,00,000 · HRA exemption and "other" as given. The total is capped at the income left after the standard deduction.
3. **Total (taxable) income** = salary − standard deduction − deductions.
4. **Slab tax.**
   - New regime (§202): ₹0–4L nil · 4–8L 5% · 8–12L 10% · 12–16L 15% · 16–20L 20% · 20–24L 25% · above 24L 30%.
   - Old regime: residents below 60 are exempt to ₹2.5L, 60–79 to ₹3L, 80+ to ₹5L; non-residents always to ₹2.5L. Then 5% to ₹5L, 20% to ₹10L, 30% above.
5. **Rebate** (§156; §87A in the 1961 Act), **residents only**.
   - New regime: the full slab tax, up to ₹60,000, when taxable income ≤ ₹12,00,000. Above that, **marginal relief** limits the tax to the income above ₹12 lakh, which matters up to about ₹12,70,588 of taxable income.
   - Old regime: up to ₹12,500 when taxable income ≤ ₹5,00,000, with no marginal relief.
6. **Surcharge** on tax after rebate: 10% above ₹50L, 15% above ₹1Cr, 25% above ₹2Cr. A 37% band above ₹5Cr exists in the old regime only, so the new regime caps at 25%. **Marginal relief** at each threshold: tax + surcharge may not exceed the tax + surcharge at the threshold by more than the income above it.
7. **Health and Education Cess**: 4% of (tax after rebate + surcharge).
8. **Total** = tax after rebate + surcharge + cess. Figures are not rounded to the nearest ₹10 the way a return is.

The result's `breakdown` shows every step: standard deduction, deductions allowed, taxable income, slab tax, rebate (with a marginal-relief flag), surcharge (after relief), cess and total.

### Worked figures (all checked in `tests/india.test.mjs` and `tests/fixtures/golden.json`)

| Salary | Regime | Taxable | Total tax |
|---|---|---|---|
| ₹12,75,000 | new | ₹12,00,000 | ₹0 (rebate) |
| ₹12,75,010 | new | ₹12,00,010 | ₹10.40 (marginal relief: ₹10 + 4% cess) |
| ₹15,00,000 | new | ₹14,25,000 | ₹97,500 |
| ₹15,00,000 | old, 80C ₹1.5L + 80D ₹25k | ₹12,75,000 | ₹2,02,800 |
| ₹20,00,000 | new / old (no deductions) | ₹19,25,000 / ₹19,50,000 | ₹1,92,400 / ₹4,13,400 |
| ₹50,85,000 | new | ₹50,10,000 | ₹11,33,600 (surcharge marginal relief) |

## 3. Regime comparison (`compare_tax_regimes`)

Both regimes are computed from the same inputs. The tool returns each regime's full breakdown, `difference.old_minus_new`, `lower_estimated_tax` (`new` / `old` / `equal`) and **`old_regime_breakeven_deductions`**. That last figure is the total old-regime deductions and exemptions at which the two regimes give the same tax. It is found by bisection (60 iterations) on a single "other" deduction, because old-regime tax only falls as deductions rise. It is `0` if the old regime is already lower, and `null` if even deducting the whole salary cannot match. At ₹20 lakh it is ₹7,08,334.

The tool reports numbers. It never calls a regime "better", and it always returns eligibility caveats. Salaried people without business income can choose each year. Deduction limits are statutory. HRA must be computed from actual rent.

## 4. Defaults and what is asked

Material fields are never defaulted silently. Every default is returned in `defaults_applied`, with `material: true` where it can change the answer:

| Field | Default | Material? |
|---|---|---|
| `regime` | `new` (the statutory default) | yes |
| `residency` | `resident` | yes (non-residents get no rebate) |
| `age_band` | `below_60` | only for the old regime |
| `old_regime_deductions` | none | yes for comparisons |
| `tax_year` | `2026-27` | no (reported) |
| `monthly_spending` | typical profile | yes, for the indirect estimate |

## 5. Scope

**Supported:** an individual, resident or non-resident, with salary income. The new regime (the default) and the old regime, side by side. Standard deduction, rebate with marginal relief, surcharge with marginal relief, 4% cess. Old-regime deductions the user enters.

**Not supported, and refused with `unsupported_scope`:** business or professional income and presumptive taxation; capital gains and other special-rate income (their interaction with the rebate is not modelled); HUFs, firms, companies, trusts, AOPs and BOIs; foreign income and assets, DTAA relief; computing TDS/TCS; GST filing; preparing or filing an ITR.

**Excluded from the figures, and stated:** EPF contributions (retirement saving, not tax), state professional tax (up to ₹2,500 a year), ESI, employer NPS and perquisites.

## 6. GST and fuel (indirect-tax estimate)

Each spending category has an **effective rate**: the share of a tax-inclusive bill that is tax, with a confidence label and a reason. These are estimates, never exact:

| Category | Effective share | Basis | Confidence |
|---|---|---|---|
| Groceries | 1.9% | 60% nil-rated staples, 40% at 5% (GST 2.0, from 22 Sep 2025) | low |
| Eating out | 4.76% | Restaurants 5% without input tax credit (5/105) | high |
| Fuel | ≈27.9% | Petrol is outside GST. Central excise ₹11.90/l plus Delhi VAT 19.40% inside a ₹102.12/l pump price (1 Oct 2026) | low |
| Shopping | 10% | Half at 5%, half at 18% | medium |
| Utilities | 5.5% | Electricity exempt; telecoms 18%; LPG 5% | low |
| Entertainment | 13.15% | 80% at 18%, 20% at 5% | medium |

The fuel share is calculated in `rules/in.js` from the PPAC figures: (excise + RSP × 0.194 / 1.194) / RSP. When pump prices or VAT change, update `PETROL` and the source entries. Nothing else needs to change.

## 7. Tests

`tests/india.test.mjs` covers:

- Slab edges just below, at and just above every threshold.
- The Budget 2025-26 table of tax on total income, and the ₹12 lakh / ₹12.75 lakh rebate edge with marginal relief up to ₹12,70,588.
- Non-residents, senior bands and the old-regime rebate.
- Surcharge marginal relief at ₹50L and ₹1Cr, the 25% cap in the new regime and the 37% band in the old.
- Cess at exactly 4%, deduction caps, the regime comparison and break-even, the legacy rule set and the year aliases.
- The material defaults, scope refusals, the rules lookup, the GST estimates and the Indian digit grouping.

`tests/golden.test.mjs` re-checks the published figures with their source, date and tolerance. It also checks every slab table just below, at and just above each threshold.

## 8. Updating for a new Finance Act

Follow `docs/UPDATING_TAX_RULES.md`. For India specifically:

1. Read the Finance Act's First Schedule and any amendment to §§19, 156, 202 and Schedule XV.
2. Add a new rule set (for example `'2027-28'`). Keep `'2026-27'` with status `legacy` if people still need it.
3. Update `YEAR_ALIASES`, `taxYearLabel`, `period`, `legalBasis`, `sections`, `ruleVersion` (`IN-2027-28-v1`) and `lastVerified`.
4. Update the tests' expected figures by hand calculation, never by copying the engine's output.
