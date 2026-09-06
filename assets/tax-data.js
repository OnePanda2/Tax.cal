/* ============================================================================
   Tax.cal — tax data  (tax year 2026, verified September 2026)
   ----------------------------------------------------------------------------
   EVERYTHING here is a planning ESTIMATE. Rates are national-headline figures,
   not personalised tax advice. To update for a new tax year, edit the numbers
   in this file only — the engine and UI read from here.

   Sources (Sept 2026): UK HoC Library / GOV.UK · IRS & Tax Foundation 2026 ·
   Germany Grundfreibetrag 2026 · France barème 2026 · Netherlands Belastingplan
   2026 · Ireland Budget 2026 (KPMG/Revenue).
   ========================================================================== */
window.TAXCAL_DATA = (function () {
  const INF = Infinity;

  /* Approx FX — USD per 1 unit of currency (for the cross-country comparison
     only). Clearly labelled "approx" in the UI. Update anytime. */
  const FX_USD = { GBP: 1.27, USD: 1.00, EUR: 1.08 };

  /* Spending categories. `def` = default monthly spend as a fraction of MONTHLY
     gross, used to pre-fill the form so a result shows instantly. */
  const CATEGORIES = [
    { id: 'groceries',     label: 'Groceries',            emoji: '🛒', def: 0.055 },
    { id: 'dining',        label: 'Eating out & takeaway', emoji: '🍽️', def: 0.035 },
    { id: 'fuel',          label: 'Fuel / petrol',        emoji: '⛽', def: 0.030 },
    { id: 'shopping',      label: 'Shopping & clothing',  emoji: '🛍️', def: 0.045 },
    { id: 'utilities',     label: 'Utilities & bills',    emoji: '💡', def: 0.040 },
    { id: 'entertainment', label: 'Subscriptions & fun',  emoji: '🎬', def: 0.020 }
  ];

  /* ---- Countries -------------------------------------------------------- */
  const COUNTRIES = {
    UK: {
      name: 'United Kingdom', flag: '🇬🇧', model: 'uk', taxYear: '2026/27',
      currency: { code: 'GBP', symbol: '£', locale: 'en-GB' },
      incomeName: 'Income tax', socialName: 'National Insurance',
      consumptionName: 'VAT', vatStandard: 0.20,
      note: 'Bands shown are for England, Wales & Northern Ireland. Scotland uses different income-tax bands.',
      /* effective tax as a fraction of the amount spent, per category */
      cat: { groceries: 0.033, dining: 0.1667, fuel: 0.55, shopping: 0.158, utilities: 0.10, entertainment: 0.1667 },
      catConf: { groceries: 'low', dining: 'high', fuel: 'med', shopping: 'med', utilities: 'med', entertainment: 'high' },
      tips: [
        ['Pay your pension by salary sacrifice', 'Contributions come out before both Income Tax and National Insurance — a rare double saving most employers offer.'],
        ['Use your £20,000 ISA allowance', 'Not a deduction, but everything inside grows and pays out completely tax-free, for life.'],
        ['Higher-rate earner? Reclaim the 40%', 'Pension contributions and Gift Aid let you claim back higher-rate relief through your tax return.']
      ]
    },

    US: {
      name: 'United States', flag: '🇺🇸', model: 'us', taxYear: '2026',
      currency: { code: 'USD', symbol: '$', locale: 'en-US' },
      incomeName: 'Federal income tax', socialName: 'Social Security + Medicare (FICA)',
      consumptionName: 'Sales tax', vatStandard: 0.0753,
      note: 'State income tax and state + local sales tax vary by the state you pick. Local city taxes (e.g. NYC) are not included.',
      /* US categories are computed from the chosen state\'s sales-tax rate ×
         a taxable share (many states exempt groceries; services often untaxed).
         Fuel is excise-based, roughly fixed. */
      catShare: { groceries: 0.25, dining: 1.0, fuel: null, shopping: 0.95, utilities: 0.40, entertainment: 0.70 },
      fuelFraction: 0.16,
      catConf: { groceries: 'low', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'med' },
      tips: [
        ['Max your 401(k)', 'Traditional contributions cut your federal — and usually state — taxable income, up to the yearly IRS limit.'],
        ['Open an HSA if you can', 'With an HSA-eligible health plan it is triple tax-free: deductible in, grows tax-free, tax-free out for medical costs.'],
        ['Your state is doing a lot of this', 'Nine states take no income tax at all. Check the country comparison — the same salary in TX or FL keeps much more.']
      ]
    },

    DE: {
      name: 'Germany', flag: '🇩🇪', model: 'de', taxYear: '2026',
      currency: { code: 'EUR', symbol: '€', locale: 'de-DE' },
      incomeName: 'Income tax (Einkommensteuer)', socialName: 'Social contributions',
      consumptionName: 'VAT (MwSt)', vatStandard: 0.19,
      note: 'Income tax is approximated from Germany’s continuous 2026 formula. Church tax and the solidarity surcharge (high earners) are not included.',
      cat: { groceries: 0.06, dining: 0.1597, fuel: 0.50, shopping: 0.1597, utilities: 0.13, entertainment: 0.1597 },
      catConf: { groceries: 'med', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'high' },
      tips: [
        ['Check your tax class (Steuerklasse)', 'If you are married, the wrong class combination quietly overpays tax all year — a free switch can fix it.'],
        ['Company & private pensions', 'bAV, Riester and Rürup contributions lower taxable income and often come with employer or state top-ups.'],
        ['Claim more than the lump sum', 'Commute, home office and work equipment (Werbungskosten) are deductible above the €1,230 automatic allowance.']
      ]
    },

    FR: {
      name: 'France', flag: '🇫🇷', model: 'fr', taxYear: '2026',
      currency: { code: 'EUR', symbol: '€', locale: 'fr-FR' },
      incomeName: 'Income tax (impôt sur le revenu)', socialName: 'Social charges (cotisations, CSG/CRDS)',
      consumptionName: 'VAT (TVA)', vatStandard: 0.20,
      note: 'Single person, one tax part (no quotient familial). Income tax uses the 2026 barème after the 10% employment allowance.',
      cat: { groceries: 0.05, dining: 0.0909, fuel: 0.55, shopping: 0.1667, utilities: 0.12, entertainment: 0.1667 },
      catConf: { groceries: 'med', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'high' },
      tips: [
        ['Feed a PER (retirement plan)', 'Payments are deducted straight from your taxable income, within your yearly ceiling — the main legal lever here.'],
        ['Home help = 50% credit', 'Childcare, cleaning and tutoring at home give a 50% tax credit on what you spend.'],
        ['Check your at-source rate', 'A wrong prélèvement à la source rate means you overpay every month and wait a year for the refund.']
      ]
    },

    NL: {
      name: 'Netherlands', flag: '🇳🇱', model: 'nl', taxYear: '2026',
      currency: { code: 'EUR', symbol: '€', locale: 'nl-NL' },
      incomeName: 'Income tax + national insurance (Box 1)', socialName: null,
      consumptionName: 'VAT (BTW)', vatStandard: 0.21,
      note: 'Box 1 rates already include national insurance. The general and labour tax credits (heffingskortingen) are applied for a working-age employee.',
      cat: { groceries: 0.07, dining: 0.0826, fuel: 0.55, shopping: 0.1736, utilities: 0.15, entertainment: 0.1736 },
      catConf: { groceries: 'med', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'high' },
      tips: [
        ['The 30% ruling', 'If you qualify as an incoming employee, up to 30% of your salary can be paid tax-free — worth thousands a year.'],
        ['Mortgage interest is deductible', 'Interest on the loan for your own home reduces your Box 1 income (hypotheekrenteaftrek).'],
        ['Don’t leave credits unclaimed', 'Make sure your employer applies the loonheffingskorting so your tax credits are actually used.']
      ]
    },

    IE: {
      name: 'Ireland', flag: '🇮🇪', model: 'ie', taxYear: '2026',
      currency: { code: 'EUR', symbol: '€', locale: 'en-IE' },
      incomeName: 'Income tax (PAYE)', socialName: 'USC + PRSI',
      consumptionName: 'VAT', vatStandard: 0.23,
      note: 'Single PAYE employee, standard personal + employee tax credits (€4,000). USC and PRSI (4.35% from Oct 2026) included.',
      cat: { groceries: 0.04, dining: 0.1189, fuel: 0.52, shopping: 0.1870, utilities: 0.14, entertainment: 0.1870 },
      catConf: { groceries: 'low', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'high' },
      tips: [
        ['Pension relief at your top rate', 'Contributions get relief at 40% for higher earners, within age-based limits — the single biggest legal lever.'],
        ['Claim the credits you forget', 'The €1,000 Rent Tax Credit and 20% medical-expense relief go unclaimed by most people every year.'],
        ['Split bands if married', 'A couple can often move part of the 20% band to the lower earner and cut the total bill.']
      ]
    },

    CA: {
      name: 'Canada', flag: '🇨🇦', model: 'ca', taxYear: '2026',
      currency: { code: 'CAD', symbol: '$', locale: 'en-CA' },
      incomeName: 'Income tax (federal + provincial)', socialName: 'CPP + EI',
      consumptionName: 'Sales tax', vatStandard: 0.05,
      regionType: 'province', regionLabel: 'Province', regionDefault: 'ON',
      note: 'Provincial income tax and combined GST/HST/PST vary by the province you pick. Quebec residents pay QPP instead of CPP (approximated here).',
      catShare: { groceries: 0.15, dining: 1.0, fuel: null, shopping: 0.95, utilities: 0.45, entertainment: 0.70 },
      fuelFraction: 0.30,
      catConf: { groceries: 'low', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'med' },
      tips: [
        ['Max your RRSP', 'Contributions come straight off your taxable income at your marginal rate — the biggest legal lever in Canada.'],
        ['Use a TFSA', 'Not a deduction, but everything inside grows and comes out completely tax-free, for life.'],
        ['Open an FHSA', 'The First Home Savings Account is deductible going in and tax-free coming out — RRSP and TFSA benefits combined.']
      ]
    },

    AU: {
      name: 'Australia', flag: '🇦🇺', model: 'au', taxYear: '2026-27',
      currency: { code: 'AUD', symbol: '$', locale: 'en-AU' },
      incomeName: 'Income tax', socialName: 'Medicare levy',
      consumptionName: 'GST', vatStandard: 0.10,
      note: 'Resident single, 2026-27 rates (the 15% bracket started 1 July 2026). Superannuation is paid by your employer on top, so it is not counted as your tax here.',
      cat: { groceries: 0.023, dining: 0.0909, fuel: 0.30, shopping: 0.0909, utilities: 0.075, entertainment: 0.0909 },
      catConf: { groceries: 'med', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'high' },
      tips: [
        ['Salary-sacrifice into super', 'Concessional contributions are taxed at 15% instead of your marginal rate — often a large saving up to the yearly cap.'],
        ['Claim your work deductions', 'Home office, tools, self-education and work travel come off your taxable income if you keep the receipts.'],
        ['Right-size private health cover', 'The correct level of hospital cover removes the 1–1.5% Medicare Levy Surcharge for higher earners.']
      ]
    },

    ES: {
      name: 'Spain', flag: '🇪🇸', model: 'es', taxYear: '2026',
      currency: { code: 'EUR', symbol: '€', locale: 'es-ES' },
      incomeName: 'Income tax (IRPF)', socialName: 'Social security',
      consumptionName: 'VAT (IVA)', vatStandard: 0.21,
      note: 'Uses a representative combined state + regional IRPF scale; your exact rate depends on your autonomous community. Single earner.',
      cat: { groceries: 0.04, dining: 0.0909, fuel: 0.48, shopping: 0.1736, utilities: 0.13, entertainment: 0.1736 },
      catConf: { groceries: 'med', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'high' },
      tips: [
        ['Pension plan contributions', 'Deductible from taxable income — the personal cap is low (€1,500/yr), but employer plans allow much more.'],
        ['Regional deductions', 'Your autonomous community adds its own deductions — rent, education, family — that many people miss.'],
        ['Check your retenciones', 'A wrong withholding rate on your nómina means you overpay every month and wait a year for the refund.']
      ]
    },

    IT: {
      name: 'Italy', flag: '🇮🇹', model: 'it', taxYear: '2026',
      currency: { code: 'EUR', symbol: '€', locale: 'it-IT' },
      incomeName: 'Income tax (IRPEF)', socialName: 'Social security (INPS)',
      consumptionName: 'VAT (IVA)', vatStandard: 0.22,
      note: 'Single employee. Includes a typical regional + municipal surcharge (addizionali ≈1.9%) and the standard employee work credit.',
      cat: { groceries: 0.06, dining: 0.0909, fuel: 0.58, shopping: 0.1803, utilities: 0.13, entertainment: 0.1803 },
      catConf: { groceries: 'med', dining: 'high', fuel: 'med', shopping: 'high', utilities: 'med', entertainment: 'high' },
      tips: [
        ['Fondo pensione (pension fund)', 'Contributions up to €5,164/yr come off your taxable income — the main personal lever in Italy.'],
        ['Claim your detrazioni', 'Medical costs, renovations (bonus casa) and dependents all reduce IRPEF — keep every receipt.'],
        ['Check your busta paga', 'Make sure your employer applies your work credits (detrazioni da lavoro) so you are not overtaxed each month.']
      ]
    }
  };

  /* ---- US states: income-tax model + combined avg sales-tax rate (%) -----
     income: {t:'none'} | {t:'flat', r} | {t:'grad', b:[[rate,upTo],…]}       */
  const US_STATES = {
    AL: { name: 'Alabama',        sales: 9.46, income: { t: 'grad', b: [[.02,500],[.04,3000],[.05,INF]] } },
    AK: { name: 'Alaska',         sales: 1.82, income: { t: 'none' } },
    AZ: { name: 'Arizona',        sales: 8.54, income: { t: 'flat', r: .025 } },
    AR: { name: 'Arkansas',       sales: 9.48, income: { t: 'grad', b: [[.02,4600],[.039,INF]] } },
    CA: { name: 'California',      sales: 9.03, income: { t: 'grad', b: [[.01,11079],[.02,26264],[.04,41452],[.06,57542],[.08,72724],[.093,371479],[.103,445771],[.113,742953],[.123,1000000],[.133,INF]] } },
    CO: { name: 'Colorado',       sales: 7.89, income: { t: 'flat', r: .044 } },
    CT: { name: 'Connecticut',    sales: 6.35, income: { t: 'grad', b: [[.02,10000],[.045,50000],[.055,100000],[.06,200000],[.065,250000],[.069,500000],[.0699,INF]] } },
    DE: { name: 'Delaware',       sales: 0.00, income: { t: 'grad', b: [[.022,5000],[.039,10000],[.048,20000],[.052,25000],[.0555,60000],[.066,INF]] } },
    FL: { name: 'Florida',        sales: 6.98, income: { t: 'none' } },
    GA: { name: 'Georgia',        sales: 7.56, income: { t: 'flat', r: .0519 } },
    HI: { name: 'Hawaii',         sales: 4.50, income: { t: 'grad', b: [[.014,9600],[.032,14400],[.055,19200],[.064,24000],[.068,36000],[.072,48000],[.076,125000],[.079,175000],[.0825,225000],[.09,275000],[.10,325000],[.11,INF]] } },
    ID: { name: 'Idaho',          sales: 6.03, income: { t: 'flat', r: .053 } },
    IL: { name: 'Illinois',       sales: 8.98, income: { t: 'flat', r: .0495 } },
    IN: { name: 'Indiana',        sales: 7.00, income: { t: 'flat', r: .0295 } },
    IA: { name: 'Iowa',           sales: 6.94, income: { t: 'flat', r: .038 } },
    KS: { name: 'Kansas',         sales: 8.71, income: { t: 'grad', b: [[.052,23000],[.0558,INF]] } },
    KY: { name: 'Kentucky',       sales: 6.00, income: { t: 'flat', r: .035 } },
    LA: { name: 'Louisiana',      sales: 10.13, income: { t: 'flat', r: .03 } },
    ME: { name: 'Maine',          sales: 5.50, income: { t: 'grad', b: [[.058,27399],[.0675,64849],[.0715,INF]] } },
    MD: { name: 'Maryland',       sales: 6.00, income: { t: 'grad', b: [[.02,1000],[.03,2000],[.04,3000],[.0475,100000],[.05,125000],[.0525,150000],[.055,250000],[.0575,500000],[.0625,1000000],[.065,INF]] } },
    MA: { name: 'Massachusetts',  sales: 6.25, income: { t: 'grad', b: [[.05,1083150],[.09,INF]] } },
    MI: { name: 'Michigan',       sales: 6.00, income: { t: 'flat', r: .0425 } },
    MN: { name: 'Minnesota',      sales: 8.14, income: { t: 'grad', b: [[.0535,33310],[.068,109430],[.0785,203150],[.0985,INF]] } },
    MS: { name: 'Mississippi',    sales: 7.06, income: { t: 'flat', r: .04 } },
    MO: { name: 'Missouri',       sales: 8.44, income: { t: 'grad', b: [[.02,2696],[.025,4044],[.03,5392],[.035,6740],[.04,8088],[.045,9436],[.047,INF]] } },
    MT: { name: 'Montana',        sales: 0.00, income: { t: 'grad', b: [[.047,47500],[.0565,INF]] } },
    NE: { name: 'Nebraska',       sales: 6.98, income: { t: 'grad', b: [[.0246,4130],[.0351,24760],[.0455,INF]] } },
    NV: { name: 'Nevada',         sales: 8.24, income: { t: 'none' } },
    NH: { name: 'New Hampshire',  sales: 0.00, income: { t: 'none' } },  /* no tax on wages */
    NJ: { name: 'New Jersey',     sales: 6.60, income: { t: 'grad', b: [[.014,20000],[.0175,35000],[.035,40000],[.0553,75000],[.0637,500000],[.0897,1000000],[.1075,INF]] } },
    NM: { name: 'New Mexico',     sales: 7.68, income: { t: 'grad', b: [[.015,5500],[.032,16500],[.043,33500],[.047,66500],[.049,210000],[.059,INF]] } },
    NY: { name: 'New York',       sales: 8.54, income: { t: 'grad', b: [[.039,8500],[.044,11700],[.0515,13900],[.054,80650],[.059,215400],[.0685,1077550],[.0965,5000000],[.103,25000000],[.109,INF]] } },
    NC: { name: 'North Carolina', sales: 7.10, income: { t: 'flat', r: .0399 } },
    ND: { name: 'North Dakota',   sales: 7.09, income: { t: 'grad', b: [[.0195,244825],[.025,INF]] } },
    OH: { name: 'Ohio',           sales: 7.29, income: { t: 'flat', r: .0275 } },
    OK: { name: 'Oklahoma',       sales: 9.06, income: { t: 'grad', b: [[.025,4900],[.035,7200],[.045,INF]] } },
    OR: { name: 'Oregon',         sales: 0.00, income: { t: 'grad', b: [[.0475,4550],[.0675,11400],[.0875,125000],[.099,INF]] } },
    PA: { name: 'Pennsylvania',   sales: 6.34, income: { t: 'flat', r: .0307 } },
    RI: { name: 'Rhode Island',   sales: 7.00, income: { t: 'grad', b: [[.0375,82050],[.0475,186450],[.0599,INF]] } },
    SC: { name: 'South Carolina', sales: 7.49, income: { t: 'grad', b: [[0,3640],[.03,18230],[.06,INF]] } },
    SD: { name: 'South Dakota',   sales: 6.11, income: { t: 'none' } },
    TN: { name: 'Tennessee',      sales: 9.61, income: { t: 'none' } },
    TX: { name: 'Texas',          sales: 8.20, income: { t: 'none' } },
    UT: { name: 'Utah',           sales: 7.42, income: { t: 'flat', r: .045 } },
    VT: { name: 'Vermont',        sales: 6.43, income: { t: 'grad', b: [[.0335,49400],[.066,119700],[.076,249700],[.0875,INF]] } },
    VA: { name: 'Virginia',       sales: 5.77, income: { t: 'grad', b: [[.02,3000],[.03,5000],[.05,17000],[.0575,INF]] } },
    WA: { name: 'Washington',     sales: 9.57, income: { t: 'none' } },  /* 7% is capital-gains only, not wages */
    WV: { name: 'West Virginia',  sales: 6.60, income: { t: 'grad', b: [[.0222,10000],[.0296,25000],[.0333,40000],[.0444,60000],[.0482,INF]] } },
    WI: { name: 'Wisconsin',      sales: 5.72, income: { t: 'grad', b: [[.035,15110],[.044,51950],[.053,332720],[.0765,INF]] } },
    WY: { name: 'Wyoming',        sales: 5.39, income: { t: 'none' } },
    DC: { name: 'District of Columbia', sales: 6.00, income: { t: 'grad', b: [[.04,10000],[.06,40000],[.065,60000],[.085,250000],[.0925,500000],[.0975,1000000],[.1075,INF]] } }
  };

  /* ---- Canadian provinces: income brackets + BPA + combined sales-tax % --- */
  const CA_PROV = {
    AB: { name: 'Alberta',                   sales: 5,      bpa: 22769, income: { b: [[.08,61200],[.10,154259],[.12,185111],[.13,246813],[.14,370220],[.15,INF]] } },
    BC: { name: 'British Columbia',          sales: 12,     bpa: 13216, income: { b: [[.056,50363],[.077,100728],[.105,115648],[.1229,140430],[.147,190405],[.168,265545],[.205,INF]] } },
    MB: { name: 'Manitoba',                  sales: 12,     bpa: 15780, income: { b: [[.108,47000],[.1275,100000],[.174,INF]] } },
    NB: { name: 'New Brunswick',             sales: 15,     bpa: 13664, income: { b: [[.094,52333],[.14,104666],[.16,193861],[.195,INF]] } },
    NL: { name: 'Newfoundland and Labrador', sales: 15,     bpa: 13094, income: { b: [[.087,44678],[.145,89354],[.158,159528],[.178,223340],[.198,285319],[.208,570638],[.213,1141275],[.218,INF]] } },
    NS: { name: 'Nova Scotia',               sales: 15,     bpa: 11932, income: { b: [[.0879,30995],[.1495,61991],[.1667,97417],[.175,157124],[.21,INF]] } },
    NT: { name: 'Northwest Territories',     sales: 5,      bpa: 18198, income: { b: [[.059,53003],[.086,106009],[.122,172346],[.1405,INF]] } },
    NU: { name: 'Nunavut',                   sales: 5,      bpa: 19659, income: { b: [[.04,55801],[.07,111602],[.09,181439],[.115,INF]] } },
    ON: { name: 'Ontario',                   sales: 13,     bpa: 12989, income: { b: [[.0505,53891],[.0915,107785],[.1116,150000],[.1216,220000],[.1316,INF]] } },
    PE: { name: 'Prince Edward Island',      sales: 15,     bpa: 15000, income: { b: [[.095,33928],[.1347,65820],[.166,106890],[.1762,142520],[.19,200000],[.20,INF]] } },
    QC: { name: 'Quebec',                    sales: 14.975, bpa: 18952, income: { b: [[.14,54345],[.19,108680],[.24,132245],[.2575,INF]] } },
    SK: { name: 'Saskatchewan',              sales: 11,     bpa: 20381, income: { b: [[.105,54532],[.125,155805],[.145,INF]] } },
    YT: { name: 'Yukon',                     sales: 5,      bpa: 16452, income: { b: [[.064,58523],[.09,117045],[.109,181440],[.128,500000],[.15,INF]] } }
  };

  /* Annual tax-advantaged contribution cap per country (local currency),
     used only for the "you could save up to" estimate. */
  const SAVINGS_CAP = { UK: 60000, US: 23500, CA: 32000, AU: 30000, IE: 25000, DE: 28000, FR: 35000, NL: 15000, ES: 1500, IT: 5164 };

  return {
    meta: { updated: 'September 2026', taxYear: '2026' },
    fxUSD: FX_USD,
    categories: CATEGORIES,
    countries: COUNTRIES,
    order: ['UK', 'US', 'CA', 'AU', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT'],
    usStates: US_STATES,
    caProvinces: CA_PROV,
    regionTable: { US: US_STATES, CA: CA_PROV },
    savingsCap: SAVINGS_CAP
  };
})();
