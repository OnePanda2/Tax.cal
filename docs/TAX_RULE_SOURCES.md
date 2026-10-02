# Tax rule sources

> Generated from `packages/tax-core/src/rules/*.js` by `npm run build:docs`. Do not edit by hand. Change the rule data, then regenerate.

Every figure Tax.cal shows, on the website or in ChatGPT, comes from the rule sets below (engine 2.0.0). Each rule set has a version, a status, its tax-year period and the date its sources were last checked. Each result carries that version so it can be traced back here. Sources are official publications where one exists. Where a rule set rests on a secondary compilation or on Tax.cal's own assumption, the table says so.

| Country | Tax year | Effective | Rule version | Status | Last verified | Direct tax confidence |
|---|---|---|---|---|---|---|
| United Kingdom | 2026-27 | 2026-04-06 – 2027-04-05 | `UK-2026-27-v2` | current | 2026-10-02 | high |
| United States | 2026 | 2026-01-01 – 2026-12-31 | `US-2026-v2` | current | 2026-10-02 | high |
| Canada | 2026 | 2026-01-01 – 2026-12-31 | `CA-2026-v2` | current | 2026-10-02 | high |
| Australia | 2026-27 | 2026-07-01 – 2027-06-30 | `AU-2026-27-v2` | current | 2026-10-02 | high |
| Ireland | 2026 | 2026-01-01 – 2026-12-31 | `IE-2026-v2` | current | 2026-10-02 | high |
| Germany | 2026 | 2026-01-01 – 2026-12-31 | `DE-2026-v2` | current | 2026-10-02 | high |
| France | 2026 | 2026-01-01 – 2026-12-31 | `FR-2026-v2` | current | 2026-10-02 | medium |
| Netherlands | 2026 | 2026-01-01 – 2026-12-31 | `NL-2026-v2` | current | 2026-10-02 | high |
| Spain | 2026 | 2026-01-01 – 2026-12-31 | `ES-2026-v2` | current | 2026-10-02 | medium |
| Italy | 2026 | 2026-01-01 – 2026-12-31 | `IT-2026-v2` | current | 2026-10-02 | medium |
| India | 2026-27 | 2026-04-01 – 2027-03-31 | `IN-2026-27-v1` | current | 2026-10-02 | high |
| India | 2025-26 | 2025-04-01 – 2026-03-31 | `IN-2025-26-legacy-v1` | legacy | 2026-10-02 | high |

**How to read the confidence labels.** *High*: the statutory schedule is applied directly for the stated taxpayer profile. *Medium*: the law is applied, but simplified for the profile, for example a representative region or a credit approximated by its formula. *Low*: a proxy or an estimate, for example US state tax outside California, or the tax inside spending. *n/a*: the country has no such tax in Tax.cal's model.

**What is never covered:** self-employment, business, rental and investment income; capital gains; companies, partnerships, trusts, Indian HUFs and firms; filing returns or paying tax; local and city income taxes; personal advice.

## Exchange rates (comparisons only)

[Euro foreign exchange reference rates (1 October 2026)](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), European Central Bank. Units per 1 EUR: EUR 1, USD 1.1298, GBP 0.85373, CAD 1.6095, AUD 1.6255, INR 108.832. Approximate, dated reference rates used only to express one salary in another currency. Exchange rates move daily; this is not a cost-of-living or purchasing-power comparison.

## Typical spending profile (Tax.cal assumption)

Used for the indirect-tax estimate when someone gives no spending. Each figure is monthly spend as a share of monthly gross pay. It is an internal assumption, reported as a default wherever it is applied.

| Category | Share of monthly gross pay |
|---|---|
| Groceries | 5.50% |
| Eating out & takeaway | 3.50% |
| Fuel / petrol | 3.00% |
| Shopping & clothing | 4.50% |
| Utilities & bills | 4.00% |
| Subscriptions & fun | 2.00% |

## Rule sets

### United Kingdom: 2026/27 tax year (6 April 2026 – 5 April 2027)

- **Rule version:** `UK-2026-27-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-04-06 to 2027-04-05
- **Legal basis:** Income Tax Act 2007 and annual Finance Acts; Social Security Contributions and Benefits Act 1992 (rates and thresholds as published by HMRC for 2026 to 2027)
- **Confidence:** direct tax high · social contributions high · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Income Tax rates and allowances for current and previous tax years](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past) | GOV.UK (HM Revenue & Customs) | Personal allowance, 20/40/45% bands for 2026 to 2027 |
| [The Personal Allowance and basic rate limit for income tax, and certain NICs thresholds, from 6 April 2026 to 5 April 2028](https://www.gov.uk/government/publications/the-personal-allowance-and-basic-rate-limit-for-income-tax-and-certain-national-insurance-contributions-nics-thresholds-from-6-april-2026-to-5-apr) | GOV.UK (HM Treasury / HMRC) | Thresholds frozen for 2026-27 |
| [Rates and thresholds for employers 2026 to 2027](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027) | GOV.UK (HMRC) | Class 1 primary threshold £12,570, UEL £50,270, 8% and 2% employee rates |
| [VAT rates on different goods and services](https://www.gov.uk/guidance/rates-of-vat-on-different-goods-and-services) | GOV.UK (HMRC) | Standard 20%, reduced 5%, zero rate |

**Assumptions**

- Single employee paid through PAYE, resident in England, Wales or Northern Ireland, with no other income.
- Personal allowance of £12,570, reduced by £1 for every £2 of income above £100,000.
- No pension contributions, salary sacrifice, student-loan repayments, benefits in kind or tax-code adjustments.

**Not included**

- Scottish income-tax bands (Scottish taxpayers are not supported).
- Student and postgraduate loan repayments (not a tax).
- Marriage Allowance, Blind Person’s Allowance and other reliefs.
- Council tax, alcohol, tobacco and vehicle duties, employer National Insurance.

**Indirect tax (estimate): VAT, standard rate 20.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 3.30% | 0.00% | low | Most food sold in a supermarket is not standard-rated in the UK. This small figure is Tax.cal’s assumption about the rest of a typical trolley — household goods, confectionery, alcohol. |
| Eating out & takeaway | 16.7% | 20.0% | high | Standard-rated. On a price that already includes 20% VAT, the tax is one sixth of what you hand over. |
| Fuel / petrol | 55.0% | — | medium | The largest single assumption: fuel duty, plus VAT charged on top of it. It is a share of the pump price, not a published rate, and pump prices move. |
| Shopping & clothing | 15.8% | 20.0% | medium | Mostly standard-rated, but not all of it — so Tax.cal uses a little under one sixth. |
| Utilities & bills | 10.0% | — | medium | Domestic energy is not charged at the standard rate; other bills generally are. This is a blend. |
| Subscriptions & fun | 16.7% | 20.0% | high | Standard-rated, so the same one sixth as eating out. |

### United States: Tax year 2026 (calendar year)

- **Rule version:** `US-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** Internal Revenue Code as amended by Public Law 119-21 (the One, Big, Beautiful Bill Act); 2026 inflation adjustments in Rev. Proc. 2025-32
- **Confidence:** direct tax high · social contributions high · regional tax low · indirect tax low

| Source | Publisher | Rule supported |
|---|---|---|
| [IRS releases tax inflation adjustments for tax year 2026, including amendments from the One, Big, Beautiful Bill](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill) | Internal Revenue Service | Standard deduction $16,100 / $32,200 and 2026 bracket thresholds |
| [Revenue Procedure 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) | Internal Revenue Service | 2026 tax rate tables |
| [2026 Cost-of-Living Adjustment (COLA) Fact Sheet](https://www.ssa.gov/news/en/cola/factsheets/2026.html) | Social Security Administration | Social Security wage base $184,500; 6.2% and 1.45% rates |
| [Questions and answers for the Additional Medicare Tax](https://www.irs.gov/businesses/small-businesses-self-employed/questions-and-answers-for-the-additional-medicare-tax) | Internal Revenue Service | 0.9% above $200,000 (single) / $250,000 (joint) |
| [Tax News (2026 indexing of California tax rates)](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html) | California Franchise Tax Board | 3.4% California CPI indexation for 2026; standard deduction $5,900 |
| [California Withholding Schedules for 2026](https://edd.ca.gov/siteassets/files/pdf_pub_ctr/26methb.pdf) | California Employment Development Department | 2026 California rate schedule thresholds |
| [Contribution Rates, Withholding Schedules, and Meals and Lodging Values](https://edd.ca.gov/en/payroll_taxes/rates_and_withholding/) | California Employment Development Department | SDI 1.3% on all wages in 2026 (no wage limit since 2024) |
| [2025 Personal Income Tax Booklet (Form 540)](https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html) | California Franchise Tax Board | 2025 personal exemption credit $153 / $306 |
| State income-tax schedules and combined state + local sales-tax averages | Compiled by Tax.cal from state revenue departments and the Tax Foundation (September 2026) | Single-filer state schedules and average sales-tax rates for the other 49 states + DC (secondary compilation) |

**Assumptions**

- A single wage earner. For married filing jointly, all wages belong to one spouse (relevant to the Social Security wage base).
- Standard deduction only — no itemised deductions, pre-tax 401(k)/HSA contributions, tips/overtime deductions or tax credits.
- Under age 65 (the 2025–2028 senior deduction is not applied).

**Not included**

- Head of household and married filing separately statuses.
- Local and city income taxes (e.g. New York City, Philadelphia).
- State disability or family-leave payroll contributions outside California.
- Alternative Minimum Tax, net investment income tax, credits (Child Tax Credit, EITC).
- Property tax.

**Indirect tax (estimate): Sales tax**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 25.0% of spend × regional rate | — | low | Most states exempt or reduce groceries; Tax.cal assumes a quarter of a grocery bill bears the full state + local rate. |
| Eating out & takeaway | 100.0% of spend × regional rate | — | high | Restaurant meals are taxable in every state with a sales tax. |
| Fuel / petrol | 16.0% | — | medium | Federal (18.4¢/gal) plus state excise, as a rough share of the pump price. |
| Shopping & clothing | 95.0% of spend × regional rate | — | high | General merchandise is taxable; a few states exempt clothing. |
| Utilities & bills | 40.0% of spend × regional rate | — | medium | Utility taxation varies widely by state; a blended taxable share. |
| Subscriptions & fun | 70.0% of spend × regional rate | — | medium | Digital subscriptions and admissions are taxed in some states but not others. |

### Canada: Tax year 2026 (calendar year)

- **Rule version:** `CA-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** Income Tax Act (Canada), Canada Pension Plan, Employment Insurance Act; provincial income tax acts; Quebec Taxation Act and QPP/QPIP rules — parameters from CRA T4127 (January 2026) and Revenu Québec
- **Confidence:** direct tax high · social contributions high · regional tax medium · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Payroll Deductions Formulas — 122nd Edition, effective January 1, 2026 (T4127)](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html) | Canada Revenue Agency | Federal brackets (14% …), BPA $16,452, Canada employment amount $1,501, CPP/EI, provincial brackets, Ontario surtax and Health Premium |
| [Payroll Deductions Formulas — 123rd Edition, effective July 1, 2026 (T4127)](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html) | Canada Revenue Agency | Mid-year provincial changes (BC, NL, PEI) |
| [Summary of the 2026 Actuarial Report on the Employment Insurance Premium Rate](https://www.canada.ca/en/employment-social-development/programs/ei/ei-list/reports/premium/rates2026.html) | Employment and Social Development Canada | EI premium rate 1.63% (1.30% in Quebec) and maximum insurable earnings |
| [Employers: Principal Changes for 2026](https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/employers-principal-changes-for-2026/) | Revenu Québec | QPP 6.30% to $74,600, QPIP 0.430% to $103,000, Quebec abatement 16.5% |
| [GST/HST and provincial sales tax rates](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html) | Canada Revenue Agency and provincial governments (compiled by Tax.cal) | Combined GST/HST/PST rate per province |

**Assumptions**

- Single employee aged 18–64 with only employment income, no RRSP/FHSA contributions and no dependants.
- Federal non-refundable credits: basic personal amount, Canada employment amount, base CPP/QPP contributions and EI/QPIP premiums. The enhanced CPP/QPP contributions are deducted from income.
- Provincial credits for the basic personal amount and CPP/EI at the lowest provincial rate.

**Not included**

- Provincial low-income tax reductions (e.g. the Ontario tax reduction, BC tax reduction) and other provincial credits.
- Quebec-specific deductions such as the deduction for workers; Quebec tax is approximated with the same credit method.
- Mid-year 2026 provincial changes announced after January 2026 (BC, Newfoundland and Labrador, PEI) are not fully reflected.
- Refundable credits and benefits (GST/HST credit, Canada Workers Benefit).

**Indirect tax (estimate): Sales tax**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 15.0% of spend × regional rate | — | low | Basic groceries are zero-rated for GST/HST; snacks, soft drinks and household goods are not. |
| Eating out & takeaway | 100.0% of spend × regional rate | — | high | Restaurant meals carry GST/HST (and PST where it applies). |
| Fuel / petrol | 30.0% | — | medium | Federal and provincial fuel excise plus GST/HST, as a rough share of the pump price. |
| Shopping & clothing | 95.0% of spend × regional rate | — | high | General merchandise is taxable. |
| Utilities & bills | 45.0% of spend × regional rate | — | medium | Some provinces relieve PST on home energy; phone and internet are taxable. |
| Subscriptions & fun | 70.0% of spend × regional rate | — | medium | Most subscriptions and admissions are taxable. |

### Australia: 2026–27 income year (1 July 2026 – 30 June 2027)

- **Rule version:** `AU-2026-27-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-07-01 to 2027-06-30
- **Legal basis:** Income Tax Rates Act 1986 as amended by the Treasury Laws Amendment (More Cost of Living Relief) Act 2025; Medicare Levy Act 1986
- **Confidence:** direct tax high · social contributions high · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Tax rates – Australian residents](https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents) | Australian Taxation Office | Resident brackets |
| [Personal income tax – new tax cuts for every Australian taxpayer](https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer) | Australian Taxation Office | 16% rate cut to 15% from 1 July 2026 (14% from 1 July 2027) |
| [Low income tax offset](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset) | Australian Taxation Office | $700 maximum; tapers to nil at $66,667 |
| [Medicare levy reduction for low-income earners](https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners) | Australian Taxation Office | 2025-26 single thresholds $28,011 / $35,013 |
| [Standard deduction for work-related expenses](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/work-related-deductions/standard-deduction-for-work-related-expenses) | Australian Taxation Office | Up to $1,000 from 2026-27, applied automatically |

**Assumptions**

- Australian resident for tax purposes, full year, single, with only salary and wages.
- The new $1,000 standard deduction for work-related expenses (from 2026-27) is applied; no other deductions.
- Low Income Tax Offset applied. Medicare levy low-income thresholds for 2026-27 are not yet published, so the 2025-26 thresholds ($28,011 / $35,013) are used.

**Not included**

- Medicare Levy Surcharge (depends on private hospital cover).
- HELP/HECS study-loan repayments (not a tax).
- Superannuation guarantee (paid by the employer on top of salary).
- Foreign residents and working-holiday makers.

**Indirect tax (estimate): GST, standard rate 10.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 2.30% | 0.00% | medium | Basic food is GST-free; processed food, drinks and household goods carry 10%. |
| Eating out & takeaway | 9.09% | 10.0% | high | 10% GST: one eleventh of a tax-inclusive price. |
| Fuel / petrol | 30.0% | — | medium | Fuel excise plus GST as a rough share of the pump price. |
| Shopping & clothing | 9.09% | 10.0% | high | Standard 10% GST. |
| Utilities & bills | 7.50% | 10.0% | medium | Energy and telecoms carry GST; water and sewerage are largely GST-free. |
| Subscriptions & fun | 9.09% | 10.0% | high | Standard 10% GST. |

### Ireland: Tax year 2026 (calendar year)

- **Rule version:** `IE-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** Taxes Consolidation Act 1997 as amended by the Finance Act 2025; Social Welfare Consolidation Act 2005 (PRSI)
- **Confidence:** direct tax high · social contributions high · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Budget 2026 Summary](https://www.revenue.ie/en/corporate/press-office/budget-information/current-year/budget-summary.pdf) | Revenue (Irish Tax and Customs) | Rates, bands, credits and USC for 2026 |
| [Budget 2026: Taxation Measures](https://www.gov.ie/en/department-of-finance/publications/budget-2026-taxation-measures/) | Department of Finance | No change to rates/bands/credits; USC 2% band to €28,700; 9% food & catering VAT from 1 July 2026 |
| [PRSI 2026 Contribution Rates and User Guide (SW14)](https://assets.gov.ie/static/documents/cb168977/PRSI_C20260116_Contribution_Rates_and_User_Guide_-_SW_14_-_English_Version_-_January_2026_.pdf-web.pdf) | Department of Social Protection | Class A 4.2%, increasing to 4.35% on 1 October 2026; €352 weekly threshold and PRSI credit |
| [Government Marks Reduction of VAT Rate to 9% for Food Businesses and Hairdressers](https://www.gov.ie/en/department-of-finance/press-releases/government-marks-reduction-of-vat-rate-to-9-for-food-businesses-and-hairdressers/) | Department of Finance | 9% VAT on food and catering from 1 July 2026 |

**Assumptions**

- Single PAYE employee with only employment income, no medical card, under 70.
- Personal credit €2,000 and employee credit €2,000; standard rate band €44,000.
- Class A PRSI at 4.2% for January–September and 4.35% for October–December 2026, with the weekly €352 threshold and tapered PRSI credit.

**Not included**

- Married/civil-partner band transfers and other credits (rent, medical, home carer).
- Reduced USC rates for medical-card holders and people over 70.
- Local Property Tax.

**Indirect tax (estimate): VAT, standard rate 23.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 4.00% | 0.00% | low | Most food is zero-rated; household goods and some foods carry 23%. |
| Eating out & takeaway | 10.1% | 9.00% | high | Food and catering: 13.5% until 30 June 2026 and 9% from 1 July 2026 — averaged over the year. |
| Fuel / petrol | 52.0% | — | medium | Mineral oil tax, carbon tax and VAT as a rough share of the pump price. |
| Shopping & clothing | 18.7% | 23.0% | high | Standard 23% rate: 23/123 of a tax-inclusive price. |
| Utilities & bills | 14.0% | — | medium | Energy at 9%–13.5%, telecoms at 23%. A blend. |
| Subscriptions & fun | 18.7% | 23.0% | high | Standard 23% rate. |

### Germany: Veranlagungszeitraum 2026 (calendar year)

- **Rule version:** `DE-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** Einkommensteuergesetz (§§ 9a, 10, 10c, 32a EStG) as amended for 2026; Solidaritätszuschlaggesetz 1995; SGB IV–XI with the Sozialversicherungsrechengrößen-Verordnung 2026
- **Confidence:** direct tax high · social contributions high · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [§ 32a EStG Einkommensteuertarif (2026)](https://www.gesetze-im-internet.de/estg/__32a.html) | Bundesministerium der Justiz / BMF Lohnsteuer-Handbuch 2026 | 2026 tariff formula and zone boundaries |
| [Amtliches Lohnsteuer-Handbuch 2026 — § 32a EStG](https://esth.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/IV-Tarif-31-34b/Paragraf-32a/paragraf-32a.html) | Bundesministerium der Finanzen | 2026 coefficients |
| [Solidaritätszuschlaggesetz 1995 (LStH 2026, Anhang 27)](https://ao.bundesfinanzministerium.de/lsth/2026/B-Anhaenge/Anhang-27/I/anhang-27-I.html) | Bundesministerium der Finanzen | Freigrenze €20,350 (single) from 2026; 11.9% mitigation zone |
| [Beitragsbemessungsgrenzen 2026](https://www.bundesregierung.de/breg-de/aktuelles/beitragsgemessungsgrenzen-2386514) | Bundesregierung | BBG €69,750 (health/care) and €101,400 (pension/unemployment); 2.9% average Zusatzbeitrag |
| [Beiträge der gesetzlichen Krankenversicherung](https://www.bundesgesundheitsministerium.de/beitraege) | Bundesministerium für Gesundheit | 14.6% general rate, split equally |
| [Finanzierung der sozialen Pflegeversicherung](https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/die-pflegeversicherung/finanzierung) | Bundesministerium für Gesundheit | Care insurance 3.6%; childless surcharge 0.6% |
| [Werte der Rentenversicherung](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Zahlen-und-Fakten/Werte-der-Rentenversicherung/werte-der-rentenversicherung_node) | Deutsche Rentenversicherung | Pension 18.6% and unemployment 2.6% contribution rates |
| [Entlastungen für Pendler und Gastronomie (Steueränderungsgesetz 2025)](https://www.bundesregierung.de/breg-de/aktuelles/steueraenderungsgesetz-bundesrat-2383684) | Bundesregierung | 7% VAT on restaurant food from 1 January 2026; drinks 19% |

**Assumptions**

- Single employee (tax class I), statutory health insurance, no church membership, aged 23+ and childless (care-insurance surcharge of 0.6% applied) unless stated otherwise.
- Taxable income = gross pay − €1,230 employee allowance − €36 special-expenses allowance − employee pension contributions − basic health (96%) and care-insurance contributions.
- Health insurance at the general rate plus half of the 2.9% average additional contribution set for 2026.

**Not included**

- Church tax (8–9% of income tax for members).
- Married couples’ joint assessment (Ehegattensplitting) and tax-class combinations.
- Private health insurance, Minijob/Midijob rules, child allowances and Kindergeld.

**Indirect tax (estimate): VAT (MwSt), standard rate 19.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 6.00% | 7.00% | medium | Food is taxed at 7% (6.5% of a tax-inclusive price); drinks and household goods at 19%. |
| Eating out & takeaway | 9.37% | 7.00% | medium | Restaurant food is permanently 7% from 1 January 2026; drinks stay at 19%. Assumes 70% food, 30% drinks. |
| Fuel / petrol | 50.0% | — | medium | Energiesteuer, CO₂ price and VAT as a rough share of the pump price. |
| Shopping & clothing | 16.0% | 19.0% | high | Standard 19% rate: 19/119 of a tax-inclusive price. |
| Utilities & bills | 13.0% | — | medium | Electricity tax plus 19% VAT on energy and telecoms; water at 7%. A blend. |
| Subscriptions & fun | 16.0% | 19.0% | high | Standard 19% rate. |

### France: Revenus 2026 (calendar year)

- **Rule version:** `FR-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** Code général des impôts (art. 83, 193, 197); loi de finances pour 2026; Code de la sécurité sociale and AGIRC-ARRCO rules for 2026 contributions
- **Confidence:** direct tax medium · social contributions medium · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Loi de finances 2026 : ce qui change pour les particuliers](https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/loi-de-finances-2026-ce-qui-change-pour-les-particuliers) | Ministère de l’Économie (economie.gouv.fr) | Barème indexed by 0.9%: 11,600 / 29,579 / 84,577 / 181,917 |
| [Pouvez-vous bénéficier de la décote de l’impôt sur le revenu ?](https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/pouvez-vous-beneficier-de-la-decote-de-limpot-sur-le-revenu) | Ministère de l’Économie (economie.gouv.fr) | Décote €897 − 45.25% of tax, single, tax below €1,982 |
| [2041-GP — Document pour remplir la déclaration des revenus de 2025](https://www.impots.gouv.fr/sites/default/files/formulaires/2041-gp/2026/2041-gp_5464.pdf) | DGFiP (impots.gouv.fr) | 10% allowance: minimum €509, maximum €14,555 |
| [Plafonds de la Sécurité sociale](https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html) | Urssaf | PSS 2026 €48,060 |
| [Taux de cotisations — secteur privé](https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html) | Urssaf | Old-age 6.90% / 0.40%, CSG 9.2% (6.8% deductible) and CRDS 0.5% on 98.25% |
| [DSN — cahier d’aide à la codification, retraite complémentaire 2026](https://www.agirc-arrco.fr/storage/Aide-a-la-codification_AA_CT2026_v1.0-1.pdf) | Agirc-Arrco | T1 3.15% + CEG 0.86%; T2 8.64% + CEG 1.08%; CET 0.14% |

**Assumptions**

- Single person, one tax part (no quotient familial), private-sector non-cadre employee, no Alsace-Moselle regime.
- Net taxable salary = gross pay − employee contributions except the non-deductible CSG (2.4%) and CRDS (0.5%); then the 10% professional-expenses allowance (€509 minimum, €14,555 maximum).
- Barème and décote from the loi de finances 2026 (2025 income) — the latest published.

**Not included**

- Contribution exceptionnelle sur les hauts revenus (3–4% above €250,000) and the 2025 differential contribution on high incomes.
- Employer-paid complementary health cover added to taxable pay; meal vouchers and other benefits.
- Couples, children and other parts; tax credits and reductions.

**Indirect tax (estimate): VAT (TVA), standard rate 20.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 5.00% | 5.50% | medium | Most food is taxed at 5.5%; some products at 20%. |
| Eating out & takeaway | 9.09% | 10.0% | high | Restaurant meals: 10% (one eleventh of a tax-inclusive price). |
| Fuel / petrol | 55.0% | — | medium | TICPE plus VAT as a rough share of the pump price. |
| Shopping & clothing | 16.7% | 20.0% | high | Standard 20% rate: one sixth of a tax-inclusive price. |
| Utilities & bills | 12.0% | — | medium | Energy taxes plus VAT; telecoms at 20%. A blend. |
| Subscriptions & fun | 16.7% | 20.0% | high | Mostly standard-rated. |

### Netherlands: Belastingjaar 2026 (calendar year)

- **Rule version:** `NL-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** Wet inkomstenbelasting 2001 as amended by the Belastingplan 2026
- **Confidence:** direct tax high · social contributions n/a · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Box 1: uitleg en tarieven](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/box_1/box_1) | Belastingdienst | 2026: 35.75% to €38,883; 37.56% to €78,426; 49.50% above |
| [Tabel algemene heffingskorting 2026](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/algemene_heffingskorting/tabel-algemene-heffingskorting-2026) | Belastingdienst | Max €3,115; reduced by 6.398% above €29,736 |
| [Tabel arbeidskorting 2026](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/arbeidskorting/tabel-arbeidskorting-2026) | Belastingdienst | Labour credit build-up and phase-out segments, max €5,685 |

**Assumptions**

- Single employee below state-pension (AOW) age with only employment income in Box 1.
- General tax credit (max €3,115, reduced by 6.398% above €29,736) and labour tax credit (max €5,685, using the 2026 build-up and phase-out) applied in full.
- Employee national-insurance premiums are inside the Box 1 rates; the income-dependent health contribution (Zvw) is paid by the employer.

**Not included**

- The 30% ruling, mortgage interest deduction and Box 2/Box 3 income.
- Fiscal partners, AOW-age rates and other credits (e.g. income-dependent combination credit).
- The nominal private health-insurance premium (not a tax).

**Indirect tax (estimate): VAT (BTW), standard rate 21.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 7.00% | 9.00% | medium | Food at 9%; household goods and drinks at 21%. |
| Eating out & takeaway | 8.26% | 9.00% | high | Restaurant food at 9%: 9/109 of a tax-inclusive price. |
| Fuel / petrol | 55.0% | — | medium | Excise plus VAT as a rough share of the pump price. |
| Shopping & clothing | 17.4% | 21.0% | high | Standard 21% rate: 21/121 of a tax-inclusive price. |
| Utilities & bills | 15.0% | — | medium | Energy tax plus VAT on energy and telecoms. A blend. |
| Subscriptions & fun | 17.4% | 21.0% | high | Mostly standard-rated. |

### Spain: Ejercicio 2026 (calendar year)

- **Rule version:** `ES-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** Ley 35/2006 del IRPF (arts. 19, 20, 57, 63, 74); Orden PJC/297/2026 (bases y tipos de cotización 2026)
- **Confidence:** direct tax medium · social contributions high · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Orden PJC/297/2026, de 30 de marzo (cotización a la Seguridad Social 2026)](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296) | Boletín Oficial del Estado | Maximum base €5,101.20/month; employee rates 4.70%, 1.55%, 0.10%, MEI 0.15% |
| [Ley 35/2006, del Impuesto sobre la Renta de las Personas Físicas (texto consolidado)](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) | Boletín Oficial del Estado | Art. 19 (other expenses €2,000), art. 20 (work-income reduction), art. 57 (personal minimum €5,550), art. 63 (state scale) |

**Assumptions**

- Single employee under 65 with a permanent contract and no dependants.
- Employee social security 6.50% (4.70% common contingencies, 1.55% unemployment, 0.10% training, 0.15% intergenerational equity) up to €5,101.20 a month.
- IRPF base = gross − social security − €2,000 other expenses − the work-income reduction; personal minimum €5,550; state scale doubled as a representative regional scale.

**Not included**

- Region-specific IRPF scales, minimums and deductions (the representative scale is a stand-in).
- The solidarity contribution on pay above the maximum base, and the 2025 deduction for minimum-wage earners.
- Basque Country and Navarre (separate tax systems).

**Indirect tax (estimate): VAT (IVA), standard rate 21.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 4.00% | 4.00% | medium | Basic food at 4%, other food at 10%, household goods at 21%. |
| Eating out & takeaway | 9.09% | 10.0% | high | Restaurant services at 10%: one eleventh of a tax-inclusive price. |
| Fuel / petrol | 48.0% | — | medium | Hydrocarbon tax plus VAT as a rough share of the pump price. |
| Shopping & clothing | 17.4% | 21.0% | high | Standard 21% rate. |
| Utilities & bills | 13.0% | — | medium | Electricity tax plus VAT; water at 10%. A blend. |
| Subscriptions & fun | 17.4% | 21.0% | high | Mostly standard-rated. |

### Italy: Periodo d’imposta 2026 (calendar year)

- **Rule version:** `IT-2026-v2` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-01-01 to 2026-12-31
- **Legal basis:** TUIR (DPR 917/1986, artt. 11 and 13) as amended by the legge di bilancio 2026; L. 207/2024 (cuneo fiscale); INPS circolare 6/2026
- **Confidence:** direct tax medium · social contributions high · regional tax n/a · indirect tax medium

| Source | Publisher | Rule supported |
|---|---|---|
| [Aliquote e calcolo dell’Irpef](https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef) | Agenzia delle Entrate | 23% to €28,000; 33% to €50,000 (from 2026); 43% above |
| [Principali misure della legge di bilancio 2026](https://www.mef.gov.it/focus/Principali-misure-della-legge-di-bilancio-2026/) | Ministero dell’Economia e delle Finanze | Second bracket cut from 35% to 33% |
| [Circolare n. 2/E del 24 febbraio 2026](https://www.agenziaentrate.gov.it/portale/documents/d/guest/circolare-n-2-del-24-febbraio-2026) | Agenzia delle Entrate | Employee credits and the cuneo fiscale credit (€1,000 for €20,000–€32,000, phasing out to €40,000) |
| INPS circolare n. 6 del 30 gennaio 2026 | INPS | 2026 contribution ceiling €122,295; +1% above €56,224 |
| [Addizionale regionale all’IRPEF — Regione Lombardia](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/addregirpef.php?reg=10) | MEF — Dipartimento delle Finanze | Lombardy rates 1.23% / 1.58% / 1.72% / 1.73% |
| [Addizionale comunale Irpef](https://www.comune.milano.it/en/argomenti/tributi/addizionale-comunale-irpef) | Comune di Milano | 0.8%, exempt up to €23,000 |

**Assumptions**

- Single private-sector employee for the full year with only employment income, first insured after 1995 (contribution ceiling applies).
- IRPEF on income after INPS contributions; employee credit (art. 13 TUIR) and the 2026 cuneo fiscale credit for incomes €20,000–€40,000.
- Regional surcharge at Lombardy’s rates and municipal surcharge at Milan’s 0.8% (exempt up to €23,000) as a representative locality.

**Not included**

- The cuneo fiscale cash bonus for incomes up to €20,000 and the €1,200 trattamento integrativo — so tax under €20,000 is overstated.
- Other regions and municipalities (surcharges range roughly from 1.2% to over 4%).
- Family credits and deductible expenses (medical, mortgage interest, renovations).

**Indirect tax (estimate): VAT (IVA), standard rate 22.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 6.00% | 4.00% | medium | Staples at 4%, much other food at 10%, household goods at 22%. |
| Eating out & takeaway | 9.09% | 10.0% | high | Restaurant services at 10%. |
| Fuel / petrol | 58.0% | — | medium | Excise (accise) plus VAT as a rough share of the pump price. |
| Shopping & clothing | 18.0% | 22.0% | high | Standard 22% rate: 22/122 of a tax-inclusive price. |
| Utilities & bills | 13.0% | — | medium | Energy excise plus VAT (10% on household energy); telecoms at 22%. |
| Subscriptions & fun | 18.0% | 22.0% | high | Mostly standard-rated. |

### India: Tax Year 2026-27 (1 April 2026 – 31 March 2027) under the Income-tax Act, 2025

- **Rule version:** `IN-2026-27-v1` (current) · **Last verified:** 2026-10-02
- **Effective:** 2026-04-01 to 2027-03-31
- **Legal basis:** Income-tax Act, 2025 (as amended by the Finance Act, 2026): §19, §156, §202; rates of surcharge and cess per the Finance Act, 2026
- **Regimes:** new regime (section 202, the default) and old regime (opt-in); rebate section 156; standard deduction section 19
- **Confidence:** direct tax high · social contributions n/a · regional tax n/a · indirect tax low

| Source | Publisher | Rule supported |
|---|---|---|
| [Income-tax Act, 2025 (30 of 2025) as amended by the Finance Act, 2026](https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf) | Income Tax Department, Government of India | §19 standard deduction, §123/Schedule XV and §126 deductions, §156 rebate, §202 new regime |
| [Section 202 — Income-tax Act, 2025](https://www.incometaxindia.gov.in/w/section-202-76) | Income Tax Department | New-regime slabs: nil to ₹4 lakh, then 5/10/15/20/25/30% |
| [Section 156 — Rebate of income-tax in case of certain individuals](https://www.incometaxindia.gov.in/w/section-156-84) | Income Tax Department | ₹60,000 up to ₹12 lakh (new regime) with marginal relief; ₹12,500 up to ₹5 lakh (old regime); residents only |
| [Section 19 — Deductions from salaries](https://www.incometaxindia.gov.in/w/section-19-206) | Income Tax Department | Standard deduction ₹75,000 (§202) / ₹50,000 (otherwise) |
| [The Finance Act, 2026 — First Schedule](https://egazette.gov.in/WriteReadData/2026/271439.pdf) | Ministry of Law and Justice (Gazette of India) | Old-regime slabs (₹2.5L / ₹3L / ₹5L exemption by age), surcharge 10/15/25/37% with marginal relief (37% not for §202), Health and Education Cess 4% |
| [FAQs on Interplay and Transition to the Income-tax Act, 2025](https://www.incometaxindia.gov.in/documents/81799/11848482/FAQs-on-Interplay-and-Transition.pdf) | Income Tax Department | FY 2025-26 income is assessed in AY 2026-27 under the 1961 Act; Tax Year 2026-27 is a separate obligation under the 2025 Act |
| [Summary of Union Budget 2026-27](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2221458&reg=3&lang=2) | Press Information Bureau | Income-tax Act, 2025 in force from 1 April 2026; no change to personal slabs |
| [No income tax on annual income up to Rs. 12 lakh under new tax regime](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098406&reg=48&lang=2) | Press Information Bureau | Slab table and ₹12.75 lakh for salaried taxpayers (worked figures used in tests) |
| [Recommendations of the 56th Meeting of the GST Council](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555&reg=48&lang=2) | Press Information Bureau / GST Council | Two-slab GST (5% and 18%, 40% special) from 22 September 2025; staples nil; most packaged food 5% |
| [FAQs on the decisions of the 56th GST Council](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163560&reg=3&lang=2) | Press Information Bureau | Apparel and footwear up to ₹2,500 at 5%; gyms, salons 5%; TVs and ACs 18% |
| [GST Rates FAQs](https://cbic-gst.gov.in/gst-rates-faq.html) | Central Board of Indirect Taxes and Customs | Restaurant services 5% without input tax credit; electricity exempt |
| [Central Excise and Customs Rate on Major Petroleum Products](https://ppac.gov.in/prices/central-excise-and-customs-rate-on-major-petroleum-products) | Petroleum Planning & Analysis Cell (PPAC) | Petrol central excise ₹11.90/litre after the ₹10 cut of 27 March 2026 |
| [VAT/Sales Tax/GST Rates on petroleum products](https://ppac.gov.in/prices/vat-sales-tax-gst-rates) | Petroleum Planning & Analysis Cell (PPAC) | Delhi VAT on petrol 19.40% (on price including dealer commission) |
| [Retail selling price of petrol, Delhi (as on 1 October 2026: ₹102.12/litre)](https://ppac.gov.in/) | Petroleum Planning & Analysis Cell (PPAC) | Pump price used for the fuel-tax share |
| [Government Slashes Excise Duty on Petrol and Diesel to Shield Consumers and OMCs from Global Oil Shock](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245970&lang=1&reg=3) | Press Information Bureau | ₹10/litre excise cut from 27 March 2026 |

**Assumptions**

- Gross annual salary from one employer; no other income.
- Resident individual below 60 unless stated. The new regime is the default; the old regime applies only if chosen.
- No employer NPS, perquisites, or exempt allowances other than an HRA exemption you enter for the old regime.
- Figures are not rounded to the nearest ₹10 the way a return is.

**Not included**

- Employee Provident Fund (EPF) contributions — retirement savings, not tax (they still reduce take-home pay).
- State professional tax (up to ₹2,500 a year; nil in some states such as Delhi).
- ESI contributions (only for wages up to ₹21,000 a month at covered employers).
- Business/professional income, capital gains, HUF, foreign income and assets, TDS, GST filing, ITR preparation.

**Indirect tax (estimate): GST, standard rate 18.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 1.90% | 5.00% | low | Fresh produce, milk and unbranded staples are nil-rated; most packaged food is 5% since GST 2.0. Assumes 60% nil and 40% at 5% (5/105 of a tax-inclusive price). |
| Eating out & takeaway | 4.76% | 5.00% | high | Stand-alone restaurants charge 5% GST without input tax credit (5/105 of the bill). Restaurants in hotels with room tariffs above ₹7,500 charge 18%. |
| Fuel / petrol | 27.9% | — | low | Petrol is outside GST. Central excise (₹11.90/l after the March 2026 cut) plus Delhi VAT (19.40%) is about 28% of the Delhi pump price (₹102.12/l, 1 Oct 2026). States with higher VAT take more. |
| Shopping & clothing | 10.0% | — | medium | Clothing and footwear up to ₹2,500 per item and many daily goods are 5%; electronics, cosmetics and pricier clothing are 18%. Assumes half of each (≈10% of a tax-inclusive bill). |
| Utilities & bills | 5.50% | — | low | Electricity is GST-exempt (state electricity duty varies and is left out); phone/internet carry 18% and LPG 5%. Assumes 50% electricity, 30% telecoms, 20% LPG. |
| Subscriptions & fun | 13.2% | 18.0% | medium | Streaming, apps and most entertainment carry 18%; gyms and cinema tickets up to ₹100 carry 5%. Assumes 80% at 18%, 20% at 5%. |

### India: FY 2025-26 (AY 2026-27) under the Income-tax Act, 1961 — legacy year

- **Rule version:** `IN-2025-26-legacy-v1` (legacy) · **Last verified:** 2026-10-02
- **Effective:** 2025-04-01 to 2026-03-31
- **Legal basis:** Income-tax Act, 1961 as amended by the Finance Act, 2025: §16(ia), §87A, §115BAC(1A); surcharge and cess per the Finance Act, 2025
- **Regimes:** new regime (section 115BAC(1A), the default) and old regime (opt-in); rebate section 87A; standard deduction section 16(ia)
- **Confidence:** direct tax high · social contributions n/a · regional tax n/a · indirect tax low

| Source | Publisher | Rule supported |
|---|---|---|
| [Key Highlights of Finance Act, 2025](https://www.incometaxindia.gov.in/documents/20117/14614782/%E2%80%8BKey-Highlights-of-Finance-Act-2025.pdf/139e2679-ed0a-9470-7277-23d5d6244b9f) | Income Tax Department | 115BAC slabs from AY 2026-27, §87A rebate ₹60,000 up to ₹12 lakh, standard deduction ₹75,000 |
| [FAQs on Interplay and Transition to the Income-tax Act, 2025](https://www.incometaxindia.gov.in/documents/81799/11848482/FAQs-on-Interplay-and-Transition.pdf) | Income Tax Department | FY 2025-26 income is assessed in AY 2026-27 under the 1961 Act; Tax Year 2026-27 is a separate obligation under the 2025 Act |
| [No income tax on annual income up to Rs. 12 lakh under new tax regime](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098406&reg=48&lang=2) | Press Information Bureau | Slab table and ₹12.75 lakh for salaried taxpayers (worked figures used in tests) |
| [Recommendations of the 56th Meeting of the GST Council](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555&reg=48&lang=2) | Press Information Bureau / GST Council | Two-slab GST (5% and 18%, 40% special) from 22 September 2025; staples nil; most packaged food 5% |
| [FAQs on the decisions of the 56th GST Council](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163560&reg=3&lang=2) | Press Information Bureau | Apparel and footwear up to ₹2,500 at 5%; gyms, salons 5%; TVs and ACs 18% |
| [GST Rates FAQs](https://cbic-gst.gov.in/gst-rates-faq.html) | Central Board of Indirect Taxes and Customs | Restaurant services 5% without input tax credit; electricity exempt |
| [Central Excise and Customs Rate on Major Petroleum Products](https://ppac.gov.in/prices/central-excise-and-customs-rate-on-major-petroleum-products) | Petroleum Planning & Analysis Cell (PPAC) | Petrol central excise ₹11.90/litre after the ₹10 cut of 27 March 2026 |
| [VAT/Sales Tax/GST Rates on petroleum products](https://ppac.gov.in/prices/vat-sales-tax-gst-rates) | Petroleum Planning & Analysis Cell (PPAC) | Delhi VAT on petrol 19.40% (on price including dealer commission) |
| [Retail selling price of petrol, Delhi (as on 1 October 2026: ₹102.12/litre)](https://ppac.gov.in/) | Petroleum Planning & Analysis Cell (PPAC) | Pump price used for the fuel-tax share |
| [Government Slashes Excise Duty on Petrol and Diesel to Shield Consumers and OMCs from Global Oil Shock](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245970&lang=1&reg=3) | Press Information Bureau | ₹10/litre excise cut from 27 March 2026 |

**Assumptions**

- Gross annual salary from one employer; no other income.
- Resident individual below 60 unless stated. The new regime is the default; the old regime applies only if chosen.
- No employer NPS, perquisites, or exempt allowances other than an HRA exemption you enter for the old regime.
- Figures are not rounded to the nearest ₹10 the way a return is.

**Not included**

- Employee Provident Fund (EPF) contributions — retirement savings, not tax (they still reduce take-home pay).
- State professional tax (up to ₹2,500 a year; nil in some states such as Delhi).
- ESI contributions (only for wages up to ₹21,000 a month at covered employers).
- Business/professional income, capital gains, HUF, foreign income and assets, TDS, GST filing, ITR preparation.

**Indirect tax (estimate): GST, standard rate 18.0%**

| Category | Share of tax-inclusive spend | Nominal rate | Confidence | Reason |
|---|---|---|---|---|
| Groceries | 1.90% | 5.00% | low | Fresh produce, milk and unbranded staples are nil-rated; most packaged food is 5% since GST 2.0. Assumes 60% nil and 40% at 5% (5/105 of a tax-inclusive price). |
| Eating out & takeaway | 4.76% | 5.00% | high | Stand-alone restaurants charge 5% GST without input tax credit (5/105 of the bill). Restaurants in hotels with room tariffs above ₹7,500 charge 18%. |
| Fuel / petrol | 27.9% | — | low | Petrol is outside GST. Central excise (₹11.90/l after the March 2026 cut) plus Delhi VAT (19.40%) is about 28% of the Delhi pump price (₹102.12/l, 1 Oct 2026). States with higher VAT take more. |
| Shopping & clothing | 10.0% | — | medium | Clothing and footwear up to ₹2,500 per item and many daily goods are 5%; electronics, cosmetics and pricier clothing are 18%. Assumes half of each (≈10% of a tax-inclusive bill). |
| Utilities & bills | 5.50% | — | low | Electricity is GST-exempt (state electricity duty varies and is left out); phone/internet carry 18% and LPG 5%. Assumes 50% electricity, 30% telecoms, 20% LPG. |
| Subscriptions & fun | 13.2% | 18.0% | medium | Streaming, apps and most entertainment carry 18%; gyms and cinema tickets up to ₹100 carry 5%. Assumes 80% at 18%, 20% at 5%. |
