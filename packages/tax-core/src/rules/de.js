/* Germany — Einkommensteuer (§32a EStG), Solidaritätszuschlag and employee
   social insurance. Church tax is excluded. */
import { deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'DE', iso: 'DE', name: 'Germany', article: '', flag: '🇩🇪', slug: 'germany',
  currency: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  incomeName: 'Income tax (Einkommensteuer)', socialName: 'Social contributions', consumptionName: 'VAT (MwSt)',
  note: 'Income tax uses the statutory 2026 §32a formula on taxable income after the standard allowances and deductible social contributions. Church tax is not included; the solidarity surcharge applies only to high earners.',
  tips: [
    ['Check your tax class (Steuerklasse)', 'If you are married, the wrong class combination quietly overpays tax all year — a free switch can fix it.'],
    ['Company & private pensions', 'bAV, Riester and Rürup contributions lower taxable income and often come with employer or state top-ups.'],
    ['Claim more than the lump sum', 'Commute, home office and work equipment (Werbungskosten) are deductible above the €1,230 automatic allowance.']
  ]
});

export const RULES = deepFreeze({
  '2026': {
    country: 'DE',
    taxYear: '2026',
    taxYearLabel: 'Veranlagungszeitraum 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'Einkommensteuergesetz (§§ 9a, 10, 10c, 32a EStG) as amended for 2026; Solidaritätszuschlaggesetz 1995; SGB IV–XI with the Sozialversicherungsrechengrößen-Verordnung 2026',
    currency: 'EUR',
    ruleVersion: 'DE-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      tariff: {
        basicAllowance: 12348,
        zone2End: 17799, zone2: { a: 914.51, b: 1400 },
        zone3End: 69878, zone3: { a: 173.10, b: 2397, c: 1034.87 },
        zone4End: 277825, zone4: { rate: 0.42, minus: 11135.63 },
        zone5: { rate: 0.45, minus: 19470.38 }
      },
      werbungskostenPauschbetrag: 1230,
      sonderausgabenPauschbetrag: 36,
      healthDeductibleShare: 0.96,   // basic cover: contribution reduced by 4% where sick pay is included
      solidarity: { rate: 0.055, freigrenze: 20350, mitigationRate: 0.119 }
    },
    socialTax: {
      pension: { rate: 0.093, ceiling: 101400 },
      unemployment: { rate: 0.013, ceiling: 101400 },
      health: { rate: 0.073, avgSupplementHalf: 0.0145, ceiling: 69750 },
      care: { rate: 0.018, childlessSurcharge: 0.006, ceiling: 69750 }
    },
    indirectTax: {
      name: 'VAT (MwSt)',
      standardRate: 0.19,
      categories: {
        groceries: { effectiveRate: 0.06, nominalRate: 0.07, confidence: 'med', reason: 'Food is taxed at 7% (6.5% of a tax-inclusive price); drinks and household goods at 19%.' },
        dining: { effectiveRate: 0.0937, nominalRate: 0.07, confidence: 'med', reason: 'Restaurant food is permanently 7% from 1 January 2026; drinks stay at 19%. Assumes 70% food, 30% drinks.' },
        fuel: { effectiveRate: 0.50, nominalRate: null, confidence: 'med', reason: 'Energiesteuer, CO₂ price and VAT as a rough share of the pump price.' },
        shopping: { effectiveRate: 0.1597, nominalRate: 0.19, confidence: 'high', reason: 'Standard 19% rate: 19/119 of a tax-inclusive price.' },
        utilities: { effectiveRate: 0.13, nominalRate: null, confidence: 'med', reason: 'Electricity tax plus 19% VAT on energy and telecoms; water at 7%. A blend.' },
        entertainment: { effectiveRate: 0.1597, nominalRate: 0.19, confidence: 'high', reason: 'Standard 19% rate.' }
      }
    },
    confidence: { direct_tax: 'high', social_contributions: 'high', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Single employee (tax class I), statutory health insurance, no church membership, aged 23+ and childless (care-insurance surcharge of 0.6% applied) unless stated otherwise.',
      'Taxable income = gross pay − €1,230 employee allowance − €36 special-expenses allowance − employee pension contributions − basic health (96%) and care-insurance contributions.',
      'Health insurance at the general rate plus half of the 2.9% average additional contribution set for 2026.'
    ],
    exclusions: [
      'Church tax (8–9% of income tax for members).',
      'Married couples’ joint assessment (Ehegattensplitting) and tax-class combinations.',
      'Private health insurance, Minijob/Midijob rules, child allowances and Kindergeld.'
    ],
    sources: [
      { id: 'estg-32a', title: '§ 32a EStG Einkommensteuertarif (2026)', publisher: 'Bundesministerium der Justiz / BMF Lohnsteuer-Handbuch 2026', url: 'https://www.gesetze-im-internet.de/estg/__32a.html', covers: '2026 tariff formula and zone boundaries' },
      { id: 'lsth-2026-32a', title: 'Amtliches Lohnsteuer-Handbuch 2026 — § 32a EStG', publisher: 'Bundesministerium der Finanzen', url: 'https://esth.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/IV-Tarif-31-34b/Paragraf-32a/paragraf-32a.html', covers: '2026 coefficients' },
      { id: 'solzg-2026', title: 'Solidaritätszuschlaggesetz 1995 (LStH 2026, Anhang 27)', publisher: 'Bundesministerium der Finanzen', url: 'https://ao.bundesfinanzministerium.de/lsth/2026/B-Anhaenge/Anhang-27/I/anhang-27-I.html', covers: 'Freigrenze €20,350 (single) from 2026; 11.9% mitigation zone' },
      { id: 'breg-bbg-2026', title: 'Beitragsbemessungsgrenzen 2026', publisher: 'Bundesregierung', url: 'https://www.bundesregierung.de/breg-de/aktuelles/beitragsgemessungsgrenzen-2386514', covers: 'BBG €69,750 (health/care) and €101,400 (pension/unemployment); 2.9% average Zusatzbeitrag' },
      { id: 'bmg-beitraege', title: 'Beiträge der gesetzlichen Krankenversicherung', publisher: 'Bundesministerium für Gesundheit', url: 'https://www.bundesgesundheitsministerium.de/beitraege', covers: '14.6% general rate, split equally' },
      { id: 'bmg-pflege', title: 'Finanzierung der sozialen Pflegeversicherung', publisher: 'Bundesministerium für Gesundheit', url: 'https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/die-pflegeversicherung/finanzierung', covers: 'Care insurance 3.6%; childless surcharge 0.6%' },
      { id: 'drv-werte', title: 'Werte der Rentenversicherung', publisher: 'Deutsche Rentenversicherung', url: 'https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Zahlen-und-Fakten/Werte-der-Rentenversicherung/werte-der-rentenversicherung_node', covers: 'Pension 18.6% and unemployment 2.6% contribution rates' },
      { id: 'breg-gastro-7', title: 'Entlastungen für Pendler und Gastronomie (Steueränderungsgesetz 2025)', publisher: 'Bundesregierung', url: 'https://www.bundesregierung.de/breg-de/aktuelles/steueraenderungsgesetz-bundesrat-2383684', covers: '7% VAT on restaurant food from 1 January 2026; drinks 19%' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
