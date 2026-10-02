/* Spain — IRPF (state + a representative regional scale) and employee social
   security. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'ES', iso: 'ES', name: 'Spain', article: '', flag: '🇪🇸', slug: 'spain',
  currency: { code: 'EUR', symbol: '€', locale: 'es-ES' },
  incomeName: 'Income tax (IRPF)', socialName: 'Social security', consumptionName: 'VAT (IVA)',
  note: 'Uses a representative combined state + regional IRPF scale; your exact rate depends on your autonomous community. Single earner.',
  tips: [
    ['Pension plan contributions', 'Deductible from taxable income — the personal cap is low (€1,500/yr), but employer plans allow much more.'],
    ['Regional deductions', 'Your autonomous community adds its own deductions — rent, education, family — that many people miss.'],
    ['Check your retenciones', 'A wrong withholding rate on your nómina means you overpay every month and wait a year for the refund.']
  ]
});

export const RULES = deepFreeze({
  '2026': {
    country: 'ES',
    taxYear: '2026',
    taxYearLabel: 'Ejercicio 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'Ley 35/2006 del IRPF (arts. 19, 20, 57, 63, 74); Orden PJC/297/2026 (bases y tipos de cotización 2026)',
    currency: 'EUR',
    ruleVersion: 'ES-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      /* State scale (art. 63) doubled to stand in for a regional scale that
         mirrors it. Real regional scales range from lower (Madrid) to higher
         (Catalonia, Valencia). */
      combinedScale: [[0.19, 12450], [0.24, 20200], [0.30, 35200], [0.37, 60000], [0.45, 300000], [0.47, INF]],
      otherExpenses: 2000,
      personalMinimum: 5550,
      /* Art. 20: 7,302 up to net work income of 14,852, then two linear tapers
         reaching zero at 19,747.50 (continuous at both joins). */
      workIncomeReduction: { full: 7302, fullTo: 14852, midSlope: 1.75, midTo: 17673.52, tailBase: 2364.34, tailSlope: 1.14, tailTo: 19747.5 }
    },
    socialTax: {
      rate: 0.065,            // 4.70 common contingencies + 1.55 unemployment + 0.10 training + 0.15 MEI
      monthlyCeiling: 5101.20,
      annualCeiling: 61214.40
    },
    indirectTax: {
      name: 'VAT (IVA)',
      standardRate: 0.21,
      categories: {
        groceries: { effectiveRate: 0.04, nominalRate: 0.04, confidence: 'med', reason: 'Basic food at 4%, other food at 10%, household goods at 21%.' },
        dining: { effectiveRate: 0.0909, nominalRate: 0.10, confidence: 'high', reason: 'Restaurant services at 10%: one eleventh of a tax-inclusive price.' },
        fuel: { effectiveRate: 0.48, nominalRate: null, confidence: 'med', reason: 'Hydrocarbon tax plus VAT as a rough share of the pump price.' },
        shopping: { effectiveRate: 0.1736, nominalRate: 0.21, confidence: 'high', reason: 'Standard 21% rate.' },
        utilities: { effectiveRate: 0.13, nominalRate: null, confidence: 'med', reason: 'Electricity tax plus VAT; water at 10%. A blend.' },
        entertainment: { effectiveRate: 0.1736, nominalRate: 0.21, confidence: 'high', reason: 'Mostly standard-rated.' }
      }
    },
    confidence: { direct_tax: 'medium', social_contributions: 'high', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Single employee under 65 with a permanent contract and no dependants.',
      'Employee social security 6.50% (4.70% common contingencies, 1.55% unemployment, 0.10% training, 0.15% intergenerational equity) up to €5,101.20 a month.',
      'IRPF base = gross − social security − €2,000 other expenses − the work-income reduction; personal minimum €5,550; state scale doubled as a representative regional scale.'
    ],
    exclusions: [
      'Region-specific IRPF scales, minimums and deductions (the representative scale is a stand-in).',
      'The solidarity contribution on pay above the maximum base, and the 2025 deduction for minimum-wage earners.',
      'Basque Country and Navarre (separate tax systems).'
    ],
    sources: [
      { id: 'boe-cotizacion-2026', title: 'Orden PJC/297/2026, de 30 de marzo (cotización a la Seguridad Social 2026)', publisher: 'Boletín Oficial del Estado', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296', covers: 'Maximum base €5,101.20/month; employee rates 4.70%, 1.55%, 0.10%, MEI 0.15%' },
      { id: 'boe-lirpf', title: 'Ley 35/2006, del Impuesto sobre la Renta de las Personas Físicas (texto consolidado)', publisher: 'Boletín Oficial del Estado', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764', covers: 'Art. 19 (other expenses €2,000), art. 20 (work-income reduction), art. 57 (personal minimum €5,550), art. 63 (state scale)' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
