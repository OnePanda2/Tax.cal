# From request to tool call

Results below are what the engine returned for rule versions IN-2026-27-v1, UK-2026-27-v2, US-2026-v2 and DE-2026-v2. They show the expected shape, so do not quote them as current figures. Always call the tool.

## Calculations

**"I earn ₹15 lakh salary in India. Estimate my income tax."**

```json
calculate_tax {"country": "IN", "gross_income": 1500000}
```

Returns `total_direct_tax` 97500 (new regime, Tax Year 2026-27), an effective rate of 0.065 and `monthly_net_income` 116875. `defaults_applied` lists regime = new and residency = resident as material. Mention both, and offer the old-regime comparison.

**"So if I earn 15 lakh, what happens?"** (India already established in the conversation): the same call. Without that context, "lakh" still points to India. Use the default and state it.

**"I'm making 25 lakh in India. What's my tax?"**

```json
calculate_tax {"country": "IN", "gross_income": 2500000}
```

Returns `total_direct_tax` 319800.

**"I make £60,000 in the UK. What is my estimated total tax burden including VAT?"**

```json
calculate_tax {"country": "UK", "gross_income": 60000}
```

Returns income tax 11432, National Insurance 3210.6 and `total_direct_tax` 14642.6. `indirect_tax_estimate.total` is 2337.07 from the typical spending profile, giving `total_estimated_tax` 16979.67. Present the VAT part as an estimate, with its own confidence.

**"I make $120k in California. Estimate federal, FICA and California income tax."** The filing status is missing, so ask: *"I need your filing status to calculate this accurately — single or married filing jointly?"* Then:

```json
calculate_tax {"country": "US", "gross_income": 120000, "region": "CA", "filing_status": "single"}
```

Returns federal income tax 17570, social contributions 10740 (Social Security, Medicare and California SDI) and California income tax 6770.86. Mention that local city taxes are not included.

**"I live in Germany and earn €70k."**

```json
calculate_tax {"country": "DE", "gross_income": 70000}
```

Returns `total_direct_tax` 27430.13. `has_children` defaults to false, so the childless care-insurance surcharge applies. Mention it.

**"How much tax am I paying?"** (nothing known yet): ask one question, *"Which country, and roughly what is your annual salary before tax?"*. Add the state and filing status if the answer is the US.

## India regimes

**"Compare old and new Indian tax regimes for ₹20 lakh."**

```json
compare_tax_regimes {"gross_income": 2000000}
```

New regime 192400, old regime 413400 (standard deduction only), `lower_estimated_tax` new, `old_regime_breakeven_deductions` 708334. Say the old regime would need about ₹7.08 lakh of deductions and exemptions to match. Do not call either regime "better".

With deductions the user gives:

```json
compare_tax_regimes {"gross_income": 1500000, "old_regime_deductions": {"section_80c": 150000, "section_80d": 25000, "hra_exemption": 240000, "home_loan_interest": 200000}}
```

New 97500 vs old 82680, so the old regime is lower on these inputs. Add the eligibility caveats the tool returns.

## Rules and comparisons

**"What assumptions does Tax.cal use for indirect tax?"**

```json
get_tax_rules {"topic": "indirect_tax"}
```

Returns the tax-inclusive method, the six categories, the typical spending profile and each country's tax (VAT, GST, sales tax). For one country's category rates and reasons, add `"country"`.

**"When were the India rules last checked?"** `get_tax_rules {"country": "IN", "topic": "sources"}`, then quote `last_verified` and `rule_version`.

**"How does tax on $100,000 compare in the US, UK, Germany and India?"**

```json
compare_countries {"gross_income": 100000, "currency": "USD", "countries": ["US", "UK", "DE", "IN"]}
```

Rows come back in that order with each country's direct-tax rate. Mention the exchange-rate date. Say the comparison covers tax rules only and is not a cost-of-living comparison, and do not rank the countries.

## Errors and refusals

| Request | Tool result or action |
|---|---|
| "Tax on R$200,000 in Brazil" | Do not call, or the call returns `unsupported_country`. List the supported countries |
| "I'm in Scotland on £45k" | `unsupported_region`: Scottish bands are not supported |
| "My salary is -50000" | `out_of_range`. Ask for the actual figure |
| "Tax on my ₹30 lakh business income" | `unsupported_scope`: salaried income only. Point to the Income Tax Department or a professional |
| "Compare regimes for my UK salary" | `unsupported_scope` from compare_tax_regimes. Use calculate_tax instead |
| "Tax for AY 2024-25" | `unsupported_tax_year`. The message lists the supported years |
| "File my Indian income tax return for me." | No tool. Tax.cal calculates and explains but does not file returns. Offer an estimate instead |
| "Guarantee that I can legally avoid ₹5 lakh of tax." | No guarantee. Eligibility depends on circumstances and the law. Offer to compare the regimes on the user's actual deductions |
| "Use Tax.cal to submit a tax payment to the government." | Refuse. Tax.cal is calculation-only and cannot make payments or contact authorities |
