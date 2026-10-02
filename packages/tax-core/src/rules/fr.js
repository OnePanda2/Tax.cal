/* France — impôt sur le revenu (one tax part) and employee social contributions
   for a private-sector, non-managerial (non-cadre) employee. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'FR', iso: 'FR', name: 'France', article: '', flag: '🇫🇷', slug: 'france',
  currency: { code: 'EUR', symbol: '€', locale: 'fr-FR' },
  incomeName: 'Income tax (impôt sur le revenu)', socialName: 'Social charges (cotisations, CSG/CRDS)', consumptionName: 'VAT (TVA)',
  note: 'Single person, one tax part. Income tax uses the latest barème (loi de finances 2026) on net taxable salary after the 10% employment allowance.',
  tips: [
    ['Feed a PER (retirement plan)', 'Payments are deducted straight from your taxable income, within your yearly ceiling — the main legal lever here.'],
    ['Home help = 50% credit', 'Childcare, cleaning and tutoring at home give a 50% tax credit on what you spend.'],
    ['Check your at-source rate', 'A wrong prélèvement à la source rate means you overpay every month and wait a year for the refund.']
  ]
});

export const RULES = deepFreeze({
  '2026': {
    country: 'FR',
    taxYear: '2026',
    taxYearLabel: 'Revenus 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'Code général des impôts (art. 83, 193, 197); loi de finances pour 2026; Code de la sécurité sociale and AGIRC-ARRCO rules for 2026 contributions',
    currency: 'EUR',
    ruleVersion: 'FR-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      bareme: [[0, 11600], [0.11, 29579], [0.30, 84577], [0.41, 181917], [0.45, INF]],
      baremeNote: 'The barème set by the loi de finances 2026 (applied to 2025 income) is the latest published; it is used as the best estimate for 2026 income until the 2027 finance law indexes it.',
      parts: 1,
      professionalAllowance: { rate: 0.10, min: 509, max: 14555 },
      decote: { threshold: 1982, base: 897, rate: 0.4525 }
    },
    socialTax: {
      pss: 48060,
      oldAgeCapped: 0.069,
      oldAgeUncapped: 0.004,
      agircT1: 0.0315, cegT1: 0.0086,
      agircT2: 0.0864, cegT2: 0.0108,
      cet: 0.0014,
      csg: { rate: 0.092, deductibleRate: 0.068, baseShare: 0.9825, baseShareCapPss: 4 },
      crds: 0.005
    },
    indirectTax: {
      name: 'VAT (TVA)',
      standardRate: 0.20,
      categories: {
        groceries: { effectiveRate: 0.05, nominalRate: 0.055, confidence: 'med', reason: 'Most food is taxed at 5.5%; some products at 20%.' },
        dining: { effectiveRate: 0.0909, nominalRate: 0.10, confidence: 'high', reason: 'Restaurant meals: 10% (one eleventh of a tax-inclusive price).' },
        fuel: { effectiveRate: 0.55, nominalRate: null, confidence: 'med', reason: 'TICPE plus VAT as a rough share of the pump price.' },
        shopping: { effectiveRate: 0.1667, nominalRate: 0.20, confidence: 'high', reason: 'Standard 20% rate: one sixth of a tax-inclusive price.' },
        utilities: { effectiveRate: 0.12, nominalRate: null, confidence: 'med', reason: 'Energy taxes plus VAT; telecoms at 20%. A blend.' },
        entertainment: { effectiveRate: 0.1667, nominalRate: 0.20, confidence: 'high', reason: 'Mostly standard-rated.' }
      }
    },
    confidence: { direct_tax: 'medium', social_contributions: 'medium', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Single person, one tax part (no quotient familial), private-sector non-cadre employee, no Alsace-Moselle regime.',
      'Net taxable salary = gross pay − employee contributions except the non-deductible CSG (2.4%) and CRDS (0.5%); then the 10% professional-expenses allowance (€509 minimum, €14,555 maximum).',
      'Barème and décote from the loi de finances 2026 (2025 income) — the latest published.'
    ],
    exclusions: [
      'Contribution exceptionnelle sur les hauts revenus (3–4% above €250,000) and the 2025 differential contribution on high incomes.',
      'Employer-paid complementary health cover added to taxable pay; meal vouchers and other benefits.',
      'Couples, children and other parts; tax credits and reductions.'
    ],
    sources: [
      { id: 'economie-lf2026', title: 'Loi de finances 2026 : ce qui change pour les particuliers', publisher: 'Ministère de l’Économie (economie.gouv.fr)', url: 'https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/loi-de-finances-2026-ce-qui-change-pour-les-particuliers', covers: 'Barème indexed by 0.9%: 11,600 / 29,579 / 84,577 / 181,917' },
      { id: 'economie-decote', title: 'Pouvez-vous bénéficier de la décote de l’impôt sur le revenu ?', publisher: 'Ministère de l’Économie (economie.gouv.fr)', url: 'https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/pouvez-vous-beneficier-de-la-decote-de-limpot-sur-le-revenu', covers: 'Décote €897 − 45.25% of tax, single, tax below €1,982' },
      { id: 'dgfip-2041gp-2026', title: '2041-GP — Document pour remplir la déclaration des revenus de 2025', publisher: 'DGFiP (impots.gouv.fr)', url: 'https://www.impots.gouv.fr/sites/default/files/formulaires/2041-gp/2026/2041-gp_5464.pdf', covers: '10% allowance: minimum €509, maximum €14,555' },
      { id: 'urssaf-pss', title: 'Plafonds de la Sécurité sociale', publisher: 'Urssaf', url: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html', covers: 'PSS 2026 €48,060' },
      { id: 'urssaf-taux', title: 'Taux de cotisations — secteur privé', publisher: 'Urssaf', url: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html', covers: 'Old-age 6.90% / 0.40%, CSG 9.2% (6.8% deductible) and CRDS 0.5% on 98.25%' },
      { id: 'agirc-arrco-2026', title: 'DSN — cahier d’aide à la codification, retraite complémentaire 2026', publisher: 'Agirc-Arrco', url: 'https://www.agirc-arrco.fr/storage/Aide-a-la-codification_AA_CT2026_v1.0-1.pdf', covers: 'T1 3.15% + CEG 0.86%; T2 8.64% + CEG 1.08%; CET 0.14%' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
