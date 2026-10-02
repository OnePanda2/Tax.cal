# Countries: inputs and caveats

`get_tax_rules` is the authority for the current rule versions and sources. This page covers what to ask and what to say.

| Code | Country | Tax year (default) | Must ask | Optional inputs | Say this with the result |
|---|---|---|---|---|---|
| `UK` | United Kingdom | 2026-27 (6 Apr – 5 Apr) | — | `region`: `england`, `wales`, `northern_ireland` | Scotland is not supported (different bands). Student loans and pension contributions are not included |
| `US` | United States | 2026 | `region` (state code), `filing_status` | — | California is calculated from its own schedule. Other states use a proxy (federal taxable income on the state's single schedule), so `regional_tax` confidence is low. Local and city taxes (e.g. NYC) are excluded. Head of household and married filing separately are not modelled |
| `CA` | Canada | 2026 | `region` (province code, e.g. `ON`, `QC`) | — | Quebec uses QPP, QPIP and the federal abatement. Provincial low-income reductions are not modelled |
| `AU` | Australia | 2026-27 (1 Jul – 30 Jun) | — | — | Resident rates. Super is paid by the employer on top. Medicare Levy Surcharge and HELP are excluded |
| `IE` | Ireland | 2026 | — | — | Single PAYE employee with standard credits. USC and Class A PRSI included |
| `DE` | Germany | 2026 | — | `has_children` | Church tax is excluded. Without children, the 0.6% care-insurance surcharge applies (a reported default) |
| `FR` | France | 2026 | — | — | One tax part (single). Confidence is medium for income tax and social contributions |
| `NL` | Netherlands | 2026 | — | — | Box 1 rates include national insurance. The 30% ruling and mortgage interest are excluded |
| `ES` | Spain | 2026 | — | — | Uses a representative regional scale, because the exact rate depends on the autonomous community. Basque Country and Navarre are excluded |
| `IT` | Italy | 2026 | — | — | Regional and municipal surcharges at Milan (Lombardy) rates. Below €20,000 the tax is overstated (cash bonuses are not modelled) |
| `IN` | India | Tax Year 2026-27 | — | `regime`, `residency`, `age_band`, `old_regime_deductions` | New regime by default. EPF and professional tax are excluded. See [india.md](india.md) |

## Currency and amounts

Pass `gross_income` as an annual amount in the country's own currency: GBP, USD, CAD, AUD, EUR (IE, DE, FR, NL, ES, IT) or INR. If the user gives another currency, ask for the local figure. To compare across currencies, use `compare_countries`, which converts at dated, approximate ECB rates.

## Indirect tax

`calculate_tax` includes an estimate of VAT, GST or sales tax and fuel duty unless `include_indirect_estimate` is false. Without `monthly_spending`, it applies a typical-household profile (about 22.5% of gross pay across six categories) and reports that as a default. If the user gives their own monthly spending, pass it: categories they do not give count as zero. Rates are computed tax-inclusively: 20% VAT is 1/6 of the price paid. Each category carries its own confidence and reason.
