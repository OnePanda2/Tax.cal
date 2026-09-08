/* ============================================================================
   Tax.cal Plus — rules engine.

   Takes the calculator's context (country, region, salary, marginal rate) plus
   the questionnaire answers, and returns a ranked list of findings.

   Three rules govern everything in this file, and they exist to keep us honest
   and out of trouble:

   1. A finding describes something to CHECK, never something we assert is true
      of the user. We have not seen their return, their payslip or their bank.
   2. Every monetary figure is an ESTIMATE derived from their marginal rate and
      a stated assumption. Where we cannot estimate responsibly, value is null
      and the finding carries no number rather than a made-up one.
   3. Anything we are not confident about is flagged for human review instead of
      being dressed up as advice.

   Amounts below are approximate ceilings for the 2026 tax year and need review
   each year alongside assets/tax-data.js.
   ========================================================================== */
window.TaxCalPlus = (function () {
  'use strict';

  /* Approximate annual ceilings, in local currency. Reviewed September 2026.
     These drive estimates only — never presented as the user's own limit. */
  var LIMITS = {
    UK: { pension: 60000, isa: 20000, marriageAllowance: 1260, wfhFlat: 312 },
    US: { retire401k: 23500, hsaSingle: 4400, hsaFamily: 8750, ira: 7000, studentLoanInt: 2500 },
    CA: { rrspPctCap: 0.18, fhsa: 8000, tfsa: 7000 },
    AU: { concessional: 30000, superTaxRate: 0.15 },
    IE: { pensionPctYoung: 0.20, medicalRelief: 0.20 },
    DE: { ruerup: 28000, homeOfficeFlat: 1260, pendlerPerKm: 0.30 },
    FR: { perPct: 0.10, sapCreditRate: 0.50, sapCeiling: 12000 },
    NL: { lijfrenteApprox: 15000 },
    ES: { pensionIndividual: 1500, pensionEmpresa: 8500 },
    IT: { fondoPensione: 5164, medicalRate: 0.19 }
  };

  function round10(x) { return Math.round(x / 10) * 10; }

  /* Estimated benefit of putting `amount` into something that reduces taxable
     income at the user's marginal rate. Deliberately conservative. */
  function atMarginal(ctx, amount) {
    if (!amount || !ctx.marginalRate) return null;
    return round10(amount * ctx.marginalRate);
  }

  /* How much room we assume is realistically available, rather than the legal
     maximum, which almost nobody can actually fund. */
  function assumedRoom(ctx, cap, fraction) {
    var f = fraction == null ? 0.10 : fraction;
    return Math.max(0, Math.min(ctx.gross * f, cap));
  }

  /* ---- rule library ------------------------------------------------------
     when(t, ctx) -> boolean, where t is a Set of the user's answer tags.
     value(ctx)   -> estimated annual benefit, or null for "cannot estimate".
     Every rule states its assumption in `basis`.
     -------------------------------------------------------------------- */
  var RULES = {

    UK: [
      { id: 'uk_pension_room', priority: 100, confidence: 'high',
        when: function (t) { return t.has('pension_room'); },
        title: 'Increase your pension contribution',
        why: 'Pension contributions come off your taxable income at your highest rate. On the minimum auto-enrolment level, most people leave the largest UK relief unused.',
        action: 'Ask your employer to raise your contribution, ideally by salary sacrifice so it also cuts National Insurance.',
        basis: 'Assumes you could redirect around 10% of gross pay into a pension, within the annual allowance.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, LIMITS.UK.pension, 0.10)); },
        caveat: 'Your own annual allowance may be lower if you are a very high earner or have already drawn a pension.' },

      { id: 'uk_salary_sacrifice', priority: 90, confidence: 'high',
        when: function (t) { return t.has('paye') && t.has('pension_room') && !t.has('salary_sacrifice'); },
        title: 'Switch your pension to salary sacrifice',
        why: 'Ordinary pension contributions save income tax but not National Insurance. Salary sacrifice saves both, and many employers pass on part of their own saving too.',
        action: 'Ask HR whether salary sacrifice is available. It is an administrative change, not a new product.',
        basis: 'Assumes an 8% National Insurance saving on the contribution you already make.',
        value: function (ctx) { return round10(assumedRoom(ctx, LIMITS.UK.pension, 0.05) * 0.08); },
        caveat: 'Sacrificing salary lowers your gross pay, which can affect mortgage affordability and some benefits.' },

      { id: 'uk_taper_100k', priority: 120, confidence: 'high',
        when: function (t, ctx) { return ctx.gross >= 100000 && ctx.gross <= 125140; },
        title: 'You are in the 60% personal allowance trap',
        why: 'Between roughly £100,000 and £125,140 your personal allowance is withdrawn, so each extra pound is effectively taxed at about 60%. Pension contributions that bring you back under £100,000 are relieved at that same effective rate.',
        action: 'Model a pension contribution large enough to bring your adjusted net income under £100,000.',
        basis: 'Estimated on the income above £100,000 shown in your calculation, relieved at roughly 60%.',
        value: function (ctx) { return round10(Math.min(ctx.gross - 100000, 25140) * 0.60); },
        caveat: 'Adjusted net income is not the same as salary — bonuses, benefits and other income all count.' },

      { id: 'uk_marriage_allowance', priority: 70, confidence: 'high',
        when: function (t) { return t.has('marriage_allowance_eligible'); },
        title: 'Claim Marriage Allowance',
        why: 'If your partner earns under the personal allowance, they can transfer part of it to you. It can also be backdated up to four tax years.',
        action: 'Apply through HMRC. The lower earner makes the claim, not you.',
        basis: 'Approximately 20% of the transferable allowance.',
        value: function () { return round10(LIMITS.UK.marriageAllowance * 0.20); },
        caveat: 'Only available where the higher earner is a basic-rate taxpayer.' },

      { id: 'uk_hicbc', priority: 95, confidence: 'med',
        when: function (t, ctx) { return t.has('children') && ctx.gross > 60000; },
        title: 'Check the High Income Child Benefit Charge',
        why: 'Above a threshold, Child Benefit is clawed back through a tax charge. A pension contribution reduces the income the charge is measured against, sometimes removing it entirely.',
        action: 'Work out your adjusted net income, then check whether a pension contribution takes you back under the threshold.',
        basis: 'Cannot be estimated without knowing how many children you claim for.',
        value: function () { return null; },
        caveat: 'If you opted out of payments, claiming without payment still protects your National Insurance record.' },

      { id: 'uk_cb_never', priority: 60, confidence: 'med',
        when: function (t) { return t.has('cb_never') || t.has('cb_opted_out'); },
        title: 'Register for Child Benefit even if you take no money',
        why: 'The claim itself gives National Insurance credits towards the State Pension for whoever is at home. Never claiming can leave a permanent gap in that record.',
        action: 'Submit a claim and tick the option to receive no payment.',
        basis: 'Long-term State Pension value, not an in-year tax saving.',
        value: function () { return null; },
        caveat: 'Worth checking with HMRC which partner should hold the claim.' },

      { id: 'uk_gift_aid', priority: 50, confidence: 'high',
        when: function (t, ctx) { return t.has('gift_aid') && ctx.marginalRate > 0.30; },
        title: 'Reclaim higher-rate relief on your donations',
        why: 'Charities recover the basic rate automatically, but if you pay above the basic rate the extra relief is yours to claim — and most people never do.',
        action: 'Record your Gift Aid donations and claim the difference through Self Assessment or by contacting HMRC.',
        basis: 'Assumes donations of roughly 1% of gross income, relieved at the difference above basic rate.',
        value: function (ctx) { return round10(ctx.gross * 0.01 * Math.max(0, ctx.marginalRate - 0.20)); },
        caveat: 'You must have paid at least as much tax as the charity reclaims.' },

      { id: 'uk_wfh', priority: 30, confidence: 'med',
        when: function (t) { return t.has('wfh') && !t.has('self_employed'); },
        title: 'Claim working-from-home relief',
        why: 'If you are required to work from home, you can claim a flat allowance without keeping receipts.',
        action: 'Claim through HMRC online. It can be backdated.',
        basis: 'Flat-rate allowance relieved at your marginal rate.',
        value: function (ctx) { return atMarginal(ctx, LIMITS.UK.wfhFlat); },
        caveat: 'Only available where working from home is required, not merely chosen.' },

      { id: 'uk_prof_fees', priority: 35, confidence: 'high',
        when: function (t) { return t.has('prof_fees') || t.has('work_expenses'); },
        title: 'Claim professional fees and work expenses',
        why: 'Subscriptions to approved professional bodies, and tools or uniform you buy yourself, are deductible. Claims can be backdated four years.',
        action: 'List what you pay for and claim through HMRC.',
        basis: 'Assumes around £300 of qualifying costs a year.',
        value: function (ctx) { return atMarginal(ctx, 300); },
        caveat: 'Only if your employer does not reimburse you, and only for bodies on HMRC’s approved list.' },

      { id: 'uk_expenses_gap', priority: 85, confidence: 'med',
        when: function (t) { return t.has('expenses_none') || t.has('expenses_partial'); },
        title: 'Your business expenses look under-claimed',
        why: 'For the self-employed, unclaimed allowable costs are the single most common overpayment. Every pound of legitimate expense reduces taxable profit at your marginal rate.',
        action: 'Review a full year of bank statements against the allowable expense categories.',
        basis: 'Assumes roughly 5% of income in currently unclaimed allowable costs.',
        value: function (ctx) { return atMarginal(ctx, ctx.gross * 0.05); },
        caveat: 'Only genuinely business-related costs qualify. This is an area where records matter.' },

      { id: 'uk_isa', priority: 40, confidence: 'high',
        when: function (t) { return t.has('savings_interest') || t.has('dividends') || t.has('cgt'); },
        title: 'Move investments inside an ISA',
        why: 'Interest, dividends and gains inside an ISA are free of UK tax entirely, and outside allowances have been cut sharply in recent years.',
        action: 'Use your annual ISA allowance before the tax year ends — it does not carry forward.',
        basis: 'Cannot be estimated without knowing your holdings.',
        value: function () { return null; },
        caveat: 'Moving existing holdings may itself trigger a gain. Sequence matters.' },

      { id: 'uk_rental_joint', priority: 55, confidence: 'med',
        when: function (t) { return t.has('rental_sole') && t.has('married'); },
        title: 'Check how the rental income is split',
        why: 'Rental profit taxed entirely on the higher earner may be taxed more than necessary if your partner has unused allowance or a lower rate.',
        action: 'Take advice on whether transferring a share of the property is worthwhile.',
        basis: 'Depends entirely on the rental profit and both incomes.',
        value: function () { return null; },
        caveat: 'This involves property ownership changes and can trigger stamp duty or capital gains. Take professional advice first.' }
    ],

    US: [
      { id: 'us_match', priority: 130, confidence: 'high',
        when: function (t) { return t.has('match_missed') || t.has('match_unclear'); },
        title: 'You may be leaving employer match on the table',
        why: 'An employer match is an immediate return on your own contribution, before any tax effect. It is the only guaranteed gain in this entire list.',
        action: 'Find your plan’s match formula and contribute at least enough to capture all of it.',
        basis: 'Assumes a common 50% match on the first 6% of pay.',
        value: function (ctx) { return round10(ctx.gross * 0.06 * 0.5); },
        caveat: 'Match formulas vary widely and some have vesting schedules. Check your plan documents.' },

      { id: 'us_401k', priority: 100, confidence: 'high',
        when: function (t) { return t.has('retire_room'); },
        title: 'Increase your 401(k) contribution',
        why: 'Traditional contributions reduce your federal taxable income, and in most states your state taxable income too.',
        action: 'Raise your deferral percentage through your payroll or plan portal.',
        basis: 'Assumes redirecting about 8% of gross pay, within the annual deferral limit.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, LIMITS.US.retire401k, 0.08)); },
        caveat: 'Roth contributions do not reduce current-year tax. This applies to traditional (pre-tax) contributions.' },

      { id: 'us_hsa', priority: 115, confidence: 'high',
        when: function (t) { return t.has('hsa_eligible_unused'); },
        title: 'Open an HSA — you appear eligible and are not using one',
        why: 'An HSA is the only account in the US system that is deductible going in, grows untaxed, and comes out untaxed for medical costs. Contributions through payroll also avoid FICA.',
        action: 'Open an HSA through your employer if offered, or independently if not.',
        basis: 'Assumes contributing the individual annual maximum.',
        value: function (ctx) { return atMarginal(ctx, LIMITS.US.hsaSingle); },
        caveat: 'You must be enrolled in a qualifying high-deductible plan and not covered by other disqualifying coverage.' },

      { id: 'us_se_retirement', priority: 110, confidence: 'high',
        when: function (t) { return t.has('se_retire_room'); },
        title: 'Open a Solo 401(k) or SEP-IRA',
        why: 'Self-employed plans allow far larger deductible contributions than a personal IRA, because you contribute as both employee and employer.',
        action: 'Compare a Solo 401(k) against a SEP-IRA for your situation and open one before your filing deadline.',
        basis: 'Assumes contributing about 15% of self-employment income.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, LIMITS.US.retire401k, 0.15)); },
        caveat: 'Limits depend on net self-employment earnings, and deadlines differ between plan types.' },

      { id: 'us_home_office', priority: 70, confidence: 'med',
        when: function (t) { return t.has('home_office'); },
        title: 'Claim the home office deduction',
        why: 'Self-employed people with a space used regularly and exclusively for business can deduct a share of housing costs.',
        action: 'Measure the space and choose between the simplified and actual-cost methods.',
        basis: 'Assumes a modest qualifying area under the simplified method.',
        value: function (ctx) { return atMarginal(ctx, 1500); },
        caveat: 'Exclusive use is strictly interpreted, and this deduction is not available to W-2 employees.' },

      { id: 'us_itemize', priority: 80, confidence: 'med',
        when: function (t) { return t.has('itemize_candidate'); },
        title: 'Check whether itemizing beats the standard deduction',
        why: 'Mortgage interest, charitable giving and state taxes can together exceed the standard deduction — but only some years, especially if giving is bunched.',
        action: 'Total your deductible items and compare against the standard deduction for your filing status.',
        basis: 'Depends entirely on your actual mortgage interest and giving.',
        value: function () { return null; },
        caveat: 'The state and local tax deduction is capped, which is what pushes most filers back to the standard deduction.' },

      { id: 'us_student_loan', priority: 40, confidence: 'high',
        when: function (t) { return t.has('student_loan'); },
        title: 'Deduct student loan interest',
        why: 'Student loan interest is deductible without itemizing, but phases out above certain incomes.',
        action: 'Use the 1098-E from your loan servicer when you file.',
        basis: 'Assumes the maximum deductible interest.',
        value: function (ctx) { return atMarginal(ctx, LIMITS.US.studentLoanInt); },
        caveat: 'Phases out at higher incomes and is unavailable if married filing separately.' },

      { id: 'us_equity', priority: 75, confidence: 'med',
        when: function (t) { return t.has('equity_sell_now') || t.has('equity_mixed'); },
        title: 'Review the timing of your stock compensation',
        why: 'Selling immediately at vest is often sensible for RSUs, but ESPP and options can be taxed very differently depending on holding periods.',
        action: 'Identify which awards you hold and what each one’s qualifying period is.',
        basis: 'Cannot be estimated without knowing your awards.',
        value: function () { return null; },
        caveat: 'Tax is only one input — concentration risk in your employer’s stock usually matters more.' },

      { id: 'us_childcare', priority: 65, confidence: 'high',
        when: function (t) { return t.has('childcare'); },
        title: 'Use a dependent care FSA if your employer offers one',
        why: 'Dependent care costs paid through a workplace FSA avoid income tax and FICA, which usually beats the tax credit for higher earners.',
        action: 'Enrol at open enrolment, or after a qualifying life event.',
        basis: 'Assumes a typical annual election.',
        value: function (ctx) { return round10(5000 * (ctx.marginalRate + 0.0765)); },
        caveat: 'Funds are use-it-or-lose-it, and you cannot claim the same expenses under both the FSA and the credit.' },

      { id: 'us_529', priority: 45, confidence: 'med',
        when: function (t) { return t.has('no_529') || t.has('saving_not_529'); },
        title: 'Check whether your state gives a 529 deduction',
        why: 'There is no federal deduction, but many states give one for contributions to their own plan.',
        action: 'Look up your state’s 529 treatment before choosing a plan provider.',
        basis: 'Varies by state; cannot be estimated generically.',
        value: function () { return null; },
        caveat: 'Some states only give relief for their own plan, others allow any plan.' },

      { id: 'us_no_state_tax', priority: 20, confidence: 'high',
        when: function (t, ctx) { return ctx.stateHasNoIncomeTax === true; },
        title: 'Your state already helps more than most',
        why: 'Your state charges no income tax, so state-level deductions are not a lever for you. Federal moves and FICA-avoiding accounts matter proportionally more.',
        action: 'Focus on pre-tax payroll accounts, which still reduce federal tax and FICA.',
        basis: 'Informational.',
        value: function () { return null; },
        caveat: 'States without income tax often recover it through property or sales taxes.' }
    ],

    CA: [
      { id: 'ca_rrsp', priority: 110, confidence: 'high',
        when: function (t) { return t.has('rrsp_room'); },
        title: 'Use your RRSP room',
        why: 'RRSP contributions reduce taxable income at your marginal rate, and unused room carries forward indefinitely — so the gap is often much larger than one year of contributions.',
        action: 'Check your CRA Notice of Assessment for your exact accumulated room.',
        basis: 'Assumes contributing about 10% of gross income.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, ctx.gross * LIMITS.CA.rrspPctCap, 0.10)); },
        caveat: 'Your real limit is on your Notice of Assessment and may be reduced by a workplace pension adjustment.' },

      { id: 'ca_fhsa', priority: 105, confidence: 'high',
        when: function (t) { return t.has('fhsa_unused') || t.has('fhsa_idle'); },
        title: 'Open and fund an FHSA',
        why: 'The FHSA is the only Canadian account that is deductible on the way in and tax-free on the way out. For a first-time buyer it beats both the RRSP and the TFSA.',
        action: 'Open one before year end — contribution room only starts once the account exists.',
        basis: 'Assumes the annual contribution limit.',
        value: function (ctx) { return atMarginal(ctx, LIMITS.CA.fhsa); },
        caveat: 'You must qualify as a first-time home buyer, and the account has a lifetime limit and time cap.' },

      { id: 'ca_spousal', priority: 70, confidence: 'med',
        when: function (t) { return t.has('spousal_rrsp_candidate'); },
        title: 'Consider a spousal RRSP',
        why: 'Contributing to a spousal RRSP gives you the deduction now and shifts future withdrawals to the lower-earning partner, lowering combined tax in retirement.',
        action: 'Discuss with your financial institution when setting up next year’s contribution.',
        basis: 'Long-term benefit; cannot be estimated as a single-year figure.',
        value: function () { return null; },
        caveat: 'Attribution rules apply if funds are withdrawn within three years.' },

      { id: 'ca_expenses', priority: 85, confidence: 'med',
        when: function (t) { return t.has('expenses_none') || t.has('expenses_partial'); },
        title: 'Your business expenses look under-claimed',
        why: 'Self-employed Canadians can deduct a wide range of costs, including a share of home and vehicle expenses used for business.',
        action: 'Review a full year of statements against CRA’s allowable categories.',
        basis: 'Assumes roughly 5% of income in unclaimed allowable costs.',
        value: function (ctx) { return atMarginal(ctx, ctx.gross * 0.05); },
        caveat: 'CRA expects records and a reasonable business-use proportion.' },

      { id: 'ca_childcare', priority: 60, confidence: 'high',
        when: function (t) { return t.has('childcare'); },
        title: 'Claim childcare expenses',
        why: 'Childcare costs are deductible, and generally must be claimed by the lower-income spouse.',
        action: 'Gather receipts and confirm which partner should make the claim.',
        basis: 'Depends on your actual childcare spend.',
        value: function () { return null; },
        caveat: 'Limits vary by the child’s age, and the lower-earner rule has exceptions.' },

      { id: 'ca_union', priority: 35, confidence: 'high',
        when: function (t) { return t.has('union_dues'); },
        title: 'Deduct union and professional dues',
        why: 'Professional and union dues are deductible where you paid them yourself and were not reimbursed.',
        action: 'Check whether they already appear on your T4 before claiming separately.',
        basis: 'Assumes around $800 of annual dues.',
        value: function (ctx) { return atMarginal(ctx, 800); },
        caveat: 'Do not double-claim amounts already reflected on your T4.' },

      { id: 'ca_moving', priority: 55, confidence: 'med',
        when: function (t) { return t.has('moving_expenses'); },
        title: 'Check whether your move is deductible',
        why: 'Moving at least 40 km closer to a new work or study location makes a wide range of moving costs deductible.',
        action: 'Total your moving costs and test the 40 km rule.',
        basis: 'Depends on your actual costs.',
        value: function () { return null; },
        caveat: 'The deduction is limited to income earned at the new location.' },

      { id: 'ca_medical', priority: 45, confidence: 'med',
        when: function (t) { return t.has('medical'); },
        title: 'Pool your medical expenses',
        why: 'Medical expenses only count above a threshold, so combining the family’s costs on one return — usually the lower earner’s — often gets more of them over the line.',
        action: 'Collect all family receipts and claim them together for the best 12-month window.',
        basis: 'Depends on your actual expenses.',
        value: function () { return null; },
        caveat: 'The threshold is a percentage of net income, so the lower earner is often the better claimant.' }
    ],

    AU: [
      { id: 'au_super_sacrifice', priority: 110, confidence: 'high',
        when: function (t) { return t.has('super_room'); },
        title: 'Salary sacrifice into super',
        why: 'Concessional contributions are taxed at 15% inside super instead of your marginal rate. The bigger the gap between those two numbers, the more this is worth.',
        action: 'Arrange salary sacrifice with your employer, or make a personal deductible contribution before 30 June.',
        basis: 'Assumes contributing about 10% of gross pay, within the concessional cap.',
        value: function (ctx) {
          var amt = assumedRoom(ctx, LIMITS.AU.concessional, 0.10);
          var gain = Math.max(0, ctx.marginalRate - LIMITS.AU.superTaxRate);
          return round10(amt * gain);
        },
        caveat: 'Super is preserved until retirement age. Very high earners pay an additional contributions tax.' },

      { id: 'au_carry_forward', priority: 100, confidence: 'high',
        when: function (t) { return t.has('super_carry_forward'); },
        title: 'Use your carried-forward concessional cap',
        why: 'Unused concessional cap from earlier years can be used now if your super balance is under the threshold — often allowing a much larger deductible contribution than one year alone.',
        action: 'Check your unused cap in myGov, then make a personal deductible contribution.',
        basis: 'Assumes using roughly one extra year of cap.',
        value: function (ctx) {
          return round10(LIMITS.AU.concessional * 0.5 * Math.max(0, ctx.marginalRate - LIMITS.AU.superTaxRate));
        },
        caveat: 'Only available if your total super balance was under the threshold at the start of the year.' },

      { id: 'au_mls', priority: 95, confidence: 'high',
        when: function (t) { return t.has('mls_exposed'); },
        title: 'Private hospital cover may cost less than the surcharge',
        why: 'Above the income threshold, going without private hospital cover triggers the Medicare Levy Surcharge. A basic policy is frequently cheaper than the surcharge itself.',
        action: 'Compare a basic hospital policy against the surcharge you would otherwise pay.',
        basis: 'Estimated at the entry-level surcharge rate on your income.',
        value: function (ctx) { return round10(ctx.gross * 0.01); },
        caveat: 'Only policies meeting the hospital cover definition remove the surcharge — extras-only will not.' },

      { id: 'au_work_deductions', priority: 70, confidence: 'med',
        when: function (t) { return t.has('work_expenses') || t.has('car_expenses') || t.has('wfh'); },
        title: 'Claim your work-related deductions',
        why: 'Australia allows deductions for tools, home office hours, and work-related car use, provided you have records.',
        action: 'Keep a logbook or diary now — the ATO expects substantiation.',
        basis: 'Assumes around $1,200 of qualifying deductions.',
        value: function (ctx) { return atMarginal(ctx, 1200); },
        caveat: 'The ATO actively audits work-related claims. Records matter more than the amount.' },

      { id: 'au_neg_gear', priority: 60, confidence: 'med',
        when: function (t) { return t.has('neg_geared'); },
        title: 'Check your negative gearing position',
        why: 'Where property costs exceed rent, the shortfall generally offsets your other income, reducing tax at your marginal rate.',
        action: 'Confirm your deductible costs and consider a depreciation schedule from a quantity surveyor.',
        basis: 'Depends on your property costs.',
        value: function () { return null; },
        caveat: 'A tax deduction does not make a loss-making investment profitable. Judge the asset on its own merits.' },

      { id: 'au_franking', priority: 40, confidence: 'med',
        when: function (t) { return t.has('franking_credits'); },
        title: 'Make sure franking credits are claimed',
        why: 'Franked dividends carry credits for tax already paid by the company. If your rate is below the company rate, the excess is refundable.',
        action: 'Include all dividend statements when you lodge.',
        basis: 'Depends on your dividend income.',
        value: function () { return null; },
        caveat: 'Holding-period rules apply to larger parcels of shares.' },

      { id: 'au_help', priority: 30, confidence: 'high',
        when: function (t) { return t.has('help_debt'); },
        title: 'Understand how HELP repayments interact with super',
        why: 'Compulsory HELP repayments are based on a repayment income that adds back reportable super contributions, so salary sacrificing does not reduce them.',
        action: 'Factor this in before assuming sacrifice lowers your HELP repayment.',
        basis: 'Informational — prevents a common mistake.',
        value: function () { return null; },
        caveat: 'This is a reason to plan carefully, not a reason to avoid super contributions.' }
    ],

    IE: [
      { id: 'ie_pension', priority: 110, confidence: 'high',
        when: function (t) { return t.has('pension_room'); },
        title: 'Increase your pension contribution',
        why: 'Irish pension contributions get relief at your marginal rate, and the percentage of salary you may contribute rises with age.',
        action: 'Increase your contribution or start AVCs through your scheme.',
        basis: 'Assumes contributing around 10% of gross salary within the age-related limit.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, ctx.gross * LIMITS.IE.pensionPctYoung, 0.10)); },
        caveat: 'Age-related percentage limits apply, and there is a cap on the salary that qualifies.' },

      { id: 'ie_medical', priority: 80, confidence: 'high',
        when: function (t) { return t.has('medical_unclaimed') || t.has('medical_partial'); },
        title: 'Claim relief on medical and dental expenses',
        why: 'Relief is available at 20% on qualifying costs and can be backdated four years — so an unclaimed history is worth more than one year alone.',
        action: 'Gather receipts and claim through Revenue myAccount for each open year.',
        basis: 'Assumes around €700 of qualifying costs a year at 20%.',
        value: function () { return round10(700 * LIMITS.IE.medicalRelief); },
        caveat: 'Routine dental and cosmetic treatments are generally excluded.' },

      { id: 'ie_rent_credit', priority: 75, confidence: 'high',
        when: function (t) { return t.has('rent_credit'); },
        title: 'Claim the Rent Tax Credit',
        why: 'Tenants can claim a credit against tax paid, and many people simply never file the claim.',
        action: 'Claim through Revenue myAccount, including any earlier years still open.',
        basis: 'Approximate value of the credit.',
        value: function () { return 750; },
        caveat: 'The tenancy generally must be registered, and the credit is limited by the tax you actually paid.' },

      { id: 'ie_home_carer', priority: 70, confidence: 'high',
        when: function (t) { return t.has('home_carer'); },
        title: 'Claim the Home Carer Tax Credit',
        why: 'Available to married couples where one partner cares for a dependent at home and has little or no income of their own.',
        action: 'Claim through Revenue. It can also be backdated.',
        basis: 'Approximate value of the credit.',
        value: function () { return 1800; },
        caveat: 'The credit reduces as the carer’s own income rises, and cannot be combined with the increased standard rate band.' },

      { id: 'ie_band_split', priority: 65, confidence: 'med',
        when: function (t) { return t.has('married') && t.has('uneven_income'); },
        title: 'Review how your standard rate band is split',
        why: 'Married couples can move part of the standard rate band between partners. Getting the split wrong means income taxed at 40% that could have been taxed at 20%.',
        action: 'Ask Revenue to reallocate the band between you for the coming year.',
        basis: 'Depends on both incomes.',
        value: function () { return null; },
        caveat: 'Part of the band is not transferable, so the split cannot be moved entirely to one partner.' },

      { id: 'ie_tuition', priority: 45, confidence: 'med',
        when: function (t) { return t.has('tuition'); },
        title: 'Claim tuition fee relief',
        why: 'Relief at 20% is available on qualifying third-level fees above a disregarded amount.',
        action: 'Claim through Revenue myAccount for each year you paid.',
        basis: 'Depends on the fees paid.',
        value: function () { return null; },
        caveat: 'A first-fee disregard applies, which removes the benefit for smaller claims.' },

      { id: 'ie_expenses', priority: 85, confidence: 'med',
        when: function (t) { return t.has('expenses_none') || t.has('expenses_partial'); },
        title: 'Your business expenses look under-claimed',
        why: 'Allowable costs reduce taxable profit at your marginal rate, and self-employed people routinely under-record them.',
        action: 'Review a full year of statements against Revenue’s allowable categories.',
        basis: 'Assumes roughly 5% of income in unclaimed costs.',
        value: function (ctx) { return atMarginal(ctx, ctx.gross * 0.05); },
        caveat: 'Only genuinely business-related expenditure qualifies.' }
    ],

    DE: [
      { id: 'de_steuerklasse', priority: 115, confidence: 'high',
        when: function (t) { return t.has('stk_unreviewed') || (t.has('married') && t.has('uneven_income')); },
        title: 'Review your Steuerklasse combination',
        why: 'For married couples with uneven incomes, III/V or IV with a factor can change monthly take-home substantially compared with the default.',
        action: 'Model the combinations and file a change with your Finanzamt — it can be changed during the year.',
        basis: 'Affects monthly cash flow immediately; the annual assessment settles the final position.',
        value: function () { return null; },
        caveat: 'The class combination changes timing more than the final total. The annual return reconciles it.' },

      { id: 'de_ruerup', priority: 100, confidence: 'high',
        when: function (t) { return t.has('vorsorge_room'); },
        title: 'Consider a Rürup (Basisrente) contribution',
        why: 'Rürup contributions are deductible up to a high ceiling, which makes them one of the few large deductions available to higher earners and the self-employed.',
        action: 'Compare providers before year end — the deduction applies to the year you pay.',
        basis: 'Assumes contributing around 10% of gross income within the ceiling.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, LIMITS.DE.ruerup, 0.10)); },
        caveat: 'Rürup capital cannot be withdrawn as a lump sum — it pays out only as a pension.' },

      { id: 'de_pendler', priority: 85, confidence: 'high',
        when: function (t) { return t.has('commute_long') || t.has('commute_medium'); },
        title: 'Claim the Pendlerpauschale properly',
        why: 'The commuting allowance is per kilometre per working day. Over a full year it frequently exceeds the standard lump sum on its own.',
        action: 'Record your one-way distance and working days, and enter it on your return.',
        basis: 'Estimated from a typical working year at the standard per-kilometre rate.',
        value: function (ctx) {
          var km = 25, days = 220;
          return atMarginal(ctx, km * days * LIMITS.DE.pendlerPerKm);
        },
        caveat: 'Only the one-way distance counts, and a higher rate applies beyond a certain distance.' },

      { id: 'de_homeoffice', priority: 60, confidence: 'med',
        when: function (t) { return t.has('homeoffice'); },
        title: 'Claim the home office allowance',
        why: 'A daily flat rate is available for days worked from home, up to an annual ceiling, without needing a separate study.',
        action: 'Count your home working days and claim the flat rate.',
        basis: 'Assumes the annual ceiling.',
        value: function (ctx) { return atMarginal(ctx, LIMITS.DE.homeOfficeFlat); },
        caveat: 'Home office days and commuting days for the same day generally cannot both be claimed.' },

      { id: 'de_werbungskosten', priority: 70, confidence: 'med',
        when: function (t) { return t.has('fortbildung') || t.has('doppelte_haushalt'); },
        title: 'Your Werbungskosten may exceed the lump sum',
        why: 'Everyone gets a standard allowance automatically, so itemising only helps once real costs exceed it — which training costs or a second household usually do.',
        action: 'Total your actual work-related costs and compare against the standard allowance.',
        basis: 'Depends on your actual costs.',
        value: function () { return null; },
        caveat: 'Below the lump sum there is no benefit to itemising at all.' },

      { id: 'de_handwerker', priority: 50, confidence: 'high',
        when: function (t) { return t.has('handwerkerleistungen'); },
        title: 'Claim relief for tradespeople’s labour',
        why: 'A portion of the labour element of household work is directly deductible from your tax, not just your taxable income.',
        action: 'Keep the invoices and pay by bank transfer — cash payments do not qualify.',
        basis: 'Assumes a typical labour component.',
        value: function () { return 600; },
        caveat: 'Only the labour and travel portion qualifies, never materials, and payment must be traceable.' },

      { id: 'de_spenden', priority: 35, confidence: 'high',
        when: function (t) { return t.has('spenden'); },
        title: 'Deduct your donations',
        why: 'Donations to recognised organisations are deductible as special expenses.',
        action: 'Collect your donation receipts for the return.',
        basis: 'Assumes around 1% of income donated.',
        value: function (ctx) { return atMarginal(ctx, ctx.gross * 0.01); },
        caveat: 'The organisation must be recognised, and larger donations need formal receipts.' }
    ],

    FR: [
      { id: 'fr_per', priority: 110, confidence: 'high',
        when: function (t) { return t.has('per_room'); },
        title: 'Pay into a PER before year end',
        why: 'PER contributions are deducted from taxable income at your marginal rate, which makes them worth most to higher-rate households.',
        action: 'Open or top up a PER before 31 December — the deduction follows the calendar year.',
        basis: 'Assumes contributing around 10% of income within your ceiling.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, ctx.gross * LIMITS.FR.perPct, 0.10)); },
        caveat: 'Funds are locked until retirement apart from limited exceptions such as buying a first home.' },

      { id: 'fr_sap', priority: 95, confidence: 'high',
        when: function (t) { return t.has('sap_unclaimed') || t.has('sap_partial'); },
        title: 'Claim the 50% credit on home help',
        why: 'Cleaning, gardening, tutoring and childcare at home attract a 50% tax credit up to a ceiling. It is a credit, so it is paid even if you owe no tax.',
        action: 'Declare the spend on your return, and use CESU or a registered provider so it qualifies.',
        basis: 'Assumes qualifying spend of around €2,000 at the 50% credit rate.',
        value: function () { return round10(2000 * LIMITS.FR.sapCreditRate); },
        caveat: 'Informal cash payments do not qualify. The provider must be declared properly.' },

      { id: 'fr_garde', priority: 80, confidence: 'high',
        when: function (t) { return t.has('garde_enfants'); },
        title: 'Claim childcare costs',
        why: 'Childcare outside the home for young children attracts a credit, separate from the home-help credit.',
        action: 'Include your crèche or childminder costs on your return.',
        basis: 'Depends on your actual costs and the child’s age.',
        value: function () { return null; },
        caveat: 'Different rules apply depending on whether care is inside or outside the home.' },

      { id: 'fr_parts', priority: 70, confidence: 'med',
        when: function (t) { return t.has('children'); },
        title: 'Check your parts fiscales are right',
        why: 'France divides household income by the number of parts before applying rates, so a missing part directly raises your rate.',
        action: 'Verify the number of parts on your avis d’imposition matches your household.',
        basis: 'Depends on income and household composition.',
        value: function () { return null; },
        caveat: 'The benefit per part is capped, so additional parts help less at very high incomes.' },

      { id: 'fr_dons', priority: 45, confidence: 'high',
        when: function (t) { return t.has('dons'); },
        title: 'Declare your charitable donations',
        why: 'Donations attract a substantial reduction, at a higher rate for organisations providing help to people in difficulty.',
        action: 'Keep the receipts and enter them on your return.',
        basis: 'Assumes around 1% of income donated at the standard reduction rate.',
        value: function (ctx) { return round10(ctx.gross * 0.01 * 0.66); },
        caveat: 'Reduction rates and ceilings differ by the type of organisation.' },

      { id: 'fr_regime', priority: 85, confidence: 'med',
        when: function (t) { return t.has('regime_micro'); },
        title: 'Compare micro against the réel regime',
        why: 'Micro applies a fixed percentage allowance regardless of what you actually spend. If your real costs are higher, réel produces a lower taxable profit.',
        action: 'Total your genuine business costs and compare them against the micro allowance.',
        basis: 'Depends on your real expenses.',
        value: function () { return null; },
        caveat: 'Switching regimes has notice requirements and is not instantly reversible.' },

      { id: 'fr_taux', priority: 40, confidence: 'med',
        when: function () { return true; },
        title: 'Check your prélèvement à la source rate',
        why: 'Your withholding rate is based on earlier years. If your income has fallen, you are lending money to the state until the return catches up.',
        action: 'Update your situation in your espace particulier on impots.gouv.fr.',
        basis: 'Cash-flow timing rather than a change in total tax.',
        value: function () { return null; },
        caveat: 'This changes when you pay, not how much you ultimately owe.' }
    ],

    NL: [
      { id: 'nl_ruling', priority: 130, confidence: 'high',
        when: function (t) { return t.has('ruling_check_urgent') || t.has('ruling_check'); },
        title: 'Check your eligibility for the 30% ruling',
        why: 'If you moved to the Netherlands for work, the ruling can exempt a substantial part of your salary from tax. It is the single largest item in the Dutch system for those who qualify.',
        action: 'Ask your employer to apply. Deadlines are strict and start from your employment date.',
        basis: 'Estimated on a portion of salary becoming untaxed.',
        value: function (ctx) { return round10(ctx.gross * 0.30 * ctx.marginalRate * 0.5); },
        caveat: 'Strict conditions apply on prior residence, salary level and application timing. Late applications lose earlier months.' },

      { id: 'nl_ruling_expiring', priority: 90, confidence: 'med',
        when: function (t) { return t.has('ruling_expired'); },
        title: 'Plan for life after the ruling',
        why: 'When the ruling ends your net pay drops sharply and your Box 3 position may change too. Planning ahead softens it.',
        action: 'Model your post-ruling net income and revisit your pension contributions.',
        basis: 'Depends on your circumstances.',
        value: function () { return null; },
        caveat: 'Some choices made under the ruling, such as partial non-resident status, cannot be continued afterwards.' },

      { id: 'nl_lijfrente', priority: 95, confidence: 'high',
        when: function (t) { return t.has('pension_room'); },
        title: 'Check your annual pension shortfall (jaarruimte)',
        why: 'If your workplace pension is below the maximum, you can contribute the shortfall to a lijfrente and deduct it.',
        action: 'Calculate your jaarruimte, and check reserveringsruimte for earlier years too.',
        basis: 'Assumes contributing about 8% of income within the shortfall.',
        value: function (ctx) { return atMarginal(ctx, assumedRoom(ctx, LIMITS.NL.lijfrenteApprox, 0.08)); },
        caveat: 'The calculation depends on your pension factor A. Contributing more than your room is penalised.' },

      { id: 'nl_hypotheek', priority: 75, confidence: 'high',
        when: function (t) { return t.has('hypotheekrente'); },
        title: 'Make sure mortgage interest relief is applied',
        why: 'Interest on a mortgage for your own home is deductible, though the rate at which relief is given has been reduced.',
        action: 'Confirm it is included in your return, or in a provisional monthly refund.',
        basis: 'Depends on your mortgage.',
        value: function () { return null; },
        caveat: 'Relief is capped at a reduced rate, and the eigenwoningforfait is added back.' },

      { id: 'nl_partner_alloc', priority: 65, confidence: 'med',
        when: function (t) { return t.has('fiscal_partner'); },
        title: 'Allocate shared deductions to the right partner',
        why: 'Fiscal partners can freely divide several items between them. Assigning them to the higher earner usually gives more relief.',
        action: 'When filing jointly, test both allocations before submitting.',
        basis: 'Depends on both incomes.',
        value: function () { return null; },
        caveat: 'Not every item can be allocated freely — check which ones qualify.' },

      { id: 'nl_zzp', priority: 85, confidence: 'med',
        when: function (t) { return t.has('zzp_unclaimed') || t.has('zzp_unclear'); },
        title: 'Check your self-employed deductions',
        why: 'Zelfstandigenaftrek and, if you recently started, the starter deduction reduce taxable profit — but only if claimed and if you meet the hours criterion.',
        action: 'Track your hours and confirm the deductions appear on your return.',
        basis: 'Depends on the current deduction level and your profit.',
        value: function () { return null; },
        caveat: 'The hours criterion is strictly applied, and these deductions are being reduced over time.' },

      { id: 'nl_box3', priority: 50, confidence: 'low',
        when: function (t) { return t.has('box3'); },
        title: 'Review your Box 3 position',
        why: 'Savings and investments are taxed on a deemed return, and the rules have been through repeated legal challenge and change.',
        action: 'Check the current basis and whether any objection route applies to you.',
        basis: 'Highly situation-specific.',
        value: function () { return null; },
        caveat: 'This area is unsettled. Take current professional advice rather than relying on general guidance.' }
    ],

    ES: [
      { id: 'es_pension_empresa', priority: 100, confidence: 'high',
        when: function (t) { return t.has('pension_room') || t.has('pension_individual'); },
        title: 'Ask about a company pension plan',
        why: 'The individual pension limit in Spain is small, but employer plans carry a far higher ceiling — so the company route is where the real relief is.',
        action: 'Ask your employer whether a plan de empleo is available.',
        basis: 'Assumes the individual limit plus a modest employer plan contribution.',
        value: function (ctx) { return atMarginal(ctx, LIMITS.ES.pensionIndividual + 2000); },
        caveat: 'The higher ceiling depends on employer contributions actually being made.' },

      { id: 'es_conjunta', priority: 95, confidence: 'high',
        when: function (t) { return t.has('filing_uncompared') || (t.has('married') && t.has('uneven_income')); },
        title: 'Compare joint against individual filing',
        why: 'Joint filing brings a reduction that usually helps when one partner earns little, and hurts when both earn well. Most people never actually compare the two.',
        action: 'Run both in Renta Web before submitting — it shows you each result.',
        basis: 'Depends on both incomes.',
        value: function () { return null; },
        caveat: 'The choice is locked once the return is filed for that year.' },

      { id: 'es_regional', priority: 85, confidence: 'med',
        when: function () { return true; },
        title: 'Check your regional deductions',
        why: 'Each autonomous community adds its own deductions on top of the state ones, covering things like rent, childcare, education and donations. They vary widely and are frequently missed.',
        action: 'Look up the deduction list for your community for this tax year.',
        basis: 'Varies by region; cannot be estimated generically.',
        value: function () { return null; },
        caveat: 'Regional rules change yearly and depend on your registered residence.' },

      { id: 'es_rent', priority: 60, confidence: 'med',
        when: function (t) { return t.has('rent_deduction'); },
        title: 'Check whether rent relief applies to you',
        why: 'State relief is limited to older contracts, but many regions offer their own rent deduction, often aimed at younger tenants.',
        action: 'Check both the state rules and your community’s.',
        basis: 'Depends on your contract date and region.',
        value: function () { return null; },
        caveat: 'State relief generally requires a contract signed before 2015.' },

      { id: 'es_mortgage_old', priority: 70, confidence: 'high',
        when: function (t) { return t.has('mortgage_pre2013'); },
        title: 'Claim the pre-2013 mortgage deduction',
        why: 'The deduction for a main home was withdrawn for later purchases, but was preserved for mortgages taken out before 2013.',
        action: 'Make sure it is applied on your return each year.',
        basis: 'Approximate value at the standard rate on the qualifying ceiling.',
        value: function () { return 1350; },
        caveat: 'Requires that you claimed it in an earlier year and still meet the conditions.' },

      { id: 'es_autonomo', priority: 80, confidence: 'med',
        when: function (t) { return t.has('expenses_none') || t.has('expenses_partial'); },
        title: 'Your autónomo expenses look under-claimed',
        why: 'Deductible costs reduce taxable profit at your marginal rate, and partial home and vehicle use is often not claimed at all.',
        action: 'Review a full year of invoices against the deductible categories.',
        basis: 'Assumes roughly 5% of income in unclaimed costs.',
        value: function (ctx) { return atMarginal(ctx, ctx.gross * 0.05); },
        caveat: 'Hacienda applies strict tests to home and vehicle expenses in particular.' },

      { id: 'es_donativos', priority: 35, confidence: 'high',
        when: function (t) { return t.has('donativos'); },
        title: 'Claim your donations',
        why: 'Donations to qualifying entities attract a generous credit, with a higher rate on the first tranche and for sustained giving.',
        action: 'Ensure the charity reports your NIF so it appears in your draft.',
        basis: 'Assumes modest annual giving at the higher first-tranche rate.',
        value: function () { return 120; },
        caveat: 'The entity must be a qualifying one under the relevant law.' }
    ],

    IT: [
      { id: 'it_fondo', priority: 105, confidence: 'high',
        when: function (t) { return t.has('pension_room'); },
        title: 'Pay into a fondo pensione',
        why: 'Contributions are deductible up to an annual ceiling, and employees who direct their TFR into a fund often also unlock an employer contribution.',
        action: 'Join your category fund or open an open-ended one before year end.',
        basis: 'Assumes contributing up to the deductible ceiling.',
        value: function (ctx) { return atMarginal(ctx, Math.min(LIMITS.IT.fondoPensione, ctx.gross * 0.08)); },
        caveat: 'Funds are locked until retirement apart from limited advances.' },

      { id: 'it_cedolare', priority: 95, confidence: 'high',
        when: function (t) { return t.has('cedolare_unused'); },
        title: 'Consider the cedolare secca on your rental',
        why: 'A flat rate on rental income replaces adding it to your ordinary income. For anyone above the lowest bracket that is usually cheaper.',
        action: 'Elect it when registering or renewing the contract.',
        basis: 'Estimated as the difference between your marginal rate and the flat rate.',
        value: function (ctx) { return round10(Math.max(0, ctx.marginalRate - 0.21) * 9000); },
        caveat: 'Electing it means giving up ISTAT rent increases for the contract period.' },

      { id: 'it_medical', priority: 80, confidence: 'high',
        when: function (t) { return t.has('medical_unclaimed') || t.has('medical_partial'); },
        title: 'Claim your medical detrazioni',
        why: 'Medical and dental costs attract a 19% detrazione above a small excess, but only with receipts and traceable payment.',
        action: 'Pay by card and keep receipts. Many appear automatically in the precompilata, but not all.',
        basis: 'Assumes around €800 of qualifying costs at 19%.',
        value: function () { return round10(800 * LIMITS.IT.medicalRate); },
        caveat: 'Cash payments generally do not qualify, apart from limited exceptions such as pharmacy purchases.' },

      { id: 'it_bonus_casa', priority: 85, confidence: 'med',
        when: function (t) { return t.has('bonus_casa'); },
        title: 'Claim renovation relief across the allowed years',
        why: 'Building and renovation work attracts a substantial detrazione, spread over several years rather than claimed at once.',
        action: 'Keep the invoices and use a bonifico parlante so the payment qualifies.',
        basis: 'Depends on the work carried out.',
        value: function () { return null; },
        caveat: 'The payment method is critical — an ordinary transfer can invalidate the claim entirely.' },

      { id: 'it_regime', priority: 90, confidence: 'med',
        when: function (t) { return t.has('regime_unreviewed'); },
        title: 'Compare forfettario against the ordinary regime',
        why: 'Forfettario has a low flat rate and simple accounting, but caps revenue and blocks almost all deductions and detrazioni.',
        action: 'Model both against your actual costs before the next tax year.',
        basis: 'Depends on your revenue and costs.',
        value: function () { return null; },
        caveat: 'Leaving forfettario is not always reversible, and exceeding the revenue threshold forces the change.' },

      { id: 'it_istruzione', priority: 45, confidence: 'high',
        when: function (t) { return t.has('spese_istruzione'); },
        title: 'Claim education and sport costs for your children',
        why: 'School fees, university fees and children’s sport activities attract detrazioni within annual limits.',
        action: 'Collect receipts and check what is already in your precompilata.',
        basis: 'Depends on what you paid.',
        value: function () { return null; },
        caveat: 'Each category has its own ceiling and traceability requirement.' },

      { id: 'it_rent', priority: 40, confidence: 'med',
        when: function (t) { return t.has('rent_detrazione'); },
        title: 'Check whether a rent detrazione applies',
        why: 'Tenants can claim a detrazione depending on contract type, income and circumstances such as being a young tenant or having moved for work.',
        action: 'Check which category your contract falls into.',
        basis: 'Depends on contract type and income.',
        value: function () { return null; },
        caveat: 'The relief reduces as income rises and disappears above a threshold.' }
    ]
  };

  /* ---- baseline checks ---------------------------------------------------
     These run for everyone in a country, regardless of answers. They exist
     because a well-organised person can legitimately trigger no rules at all,
     and a paid product must never return an empty page. Each is a genuine
     check, not filler — mostly "verify the system has you right", which is
     where quiet overpayments actually hide.
     -------------------------------------------------------------------- */
  var BASELINE = {
    UK: [{ id: 'uk_tax_code', priority: 25, confidence: 'high',
      title: 'Check your PAYE tax code is correct',
      why: 'HMRC issues codes from estimates and old information. A wrong code quietly over-taxes you every payday, and you can reclaim up to four earlier years.',
      action: 'Compare the code on your payslip against your Personal Tax Account and query anything unexpected.',
      basis: 'Cannot be estimated without seeing your code.',
      value: function () { return null; },
      caveat: 'A wrong code can equally mean you have underpaid, so check before spending anything.' }],

    US: [{ id: 'us_withholding', priority: 25, confidence: 'high',
      title: 'Check your W-4 withholding',
      why: 'A large refund is not a win — it means you lent the government money for free all year. Consistent underwithholding risks a penalty instead.',
      action: 'Run the IRS withholding estimator and update your W-4 if it is meaningfully off.',
      basis: 'Cash-flow timing rather than a change in total tax.',
      value: function () { return null; },
      caveat: 'Changing withholding alters your take-home pay immediately, so adjust deliberately.' }],

    CA: [{ id: 'ca_noa', priority: 25, confidence: 'high',
      title: 'Read your Notice of Assessment for carry-forward room',
      why: 'Your Notice lists unused RRSP room, tuition credits and capital losses carried forward. These accumulate silently and are routinely forgotten.',
      action: 'Sign in to CRA My Account and check each carry-forward balance.',
      basis: 'Depends on your accumulated balances.',
      value: function () { return null; },
      caveat: 'Carried-forward amounts have their own rules about when and how they can be used.' }],

    AU: [{ id: 'au_prefill', priority: 25, confidence: 'med',
      title: 'Do not just accept the pre-filled return',
      why: 'The ATO pre-fills income but not your deductions. Accepting it unchanged means claiming nothing you were entitled to.',
      action: 'Review your deductions before lodging, and keep records as you go rather than at year end.',
      basis: 'Depends on your deductible spend.',
      value: function () { return null; },
      caveat: 'Only claim what you can substantiate — the ATO data-matches heavily.' }],

    IE: [{ id: 'ie_credits_review', priority: 25, confidence: 'high',
      title: 'Review your tax credits on myAccount',
      why: 'Irish credits are applied only if Revenue knows they apply to you. People change jobs or circumstances and never update them.',
      action: 'Check your Tax Credit Certificate and request a Statement of Liability for open years.',
      basis: 'Depends on which credits are missing.',
      value: function () { return null; },
      caveat: 'A review can also reveal an underpayment, which Revenue will then collect.' }],

    DE: [{ id: 'de_file_return', priority: 30, confidence: 'high',
      title: 'File a return even if you are not required to',
      why: 'Many employees are not obliged to file and therefore never do — while the average voluntary assessment results in a refund. You can file for several earlier years at once.',
      action: 'Submit a voluntary Einkommensteuererklärung for each open year.',
      basis: 'Depends entirely on your deductible costs.',
      value: function () { return null; },
      caveat: 'Voluntary filing is generally safe, but once you are required to file, the obligation continues.' }],

    NL: [{ id: 'nl_check_return', priority: 25, confidence: 'med',
      title: 'Check the pre-filled return rather than accepting it',
      why: 'The Belastingdienst pre-fills income and some deductions, but not everything. Deductible items are frequently missing.',
      action: 'Review each section before submitting, especially deductions and allocations between partners.',
      basis: 'Depends on what is missing.',
      value: function () { return null; },
      caveat: 'You remain responsible for the return even where figures were pre-filled.' }],

    IT: [{ id: 'it_precompilata', priority: 25, confidence: 'med',
      title: 'Check the precompilata before accepting it',
      why: 'The pre-filled return captures many expenses automatically but not all. Accepting it unchanged can mean losing detrazioni you were entitled to.',
      action: 'Compare it against your own receipts before confirming.',
      basis: 'Depends on what is missing.',
      value: function () { return null; },
      caveat: 'Modifying the precompilata can change which checks Revenue applies to your return.' }]
  };

  /* ---- evaluation -------------------------------------------------------- */

  /* Collect every tag the user's answers imply. */
  function tagsFrom(countryKey, answers) {
    var set = new Set();
    var def = window.TAXCAL_PLUS_Q.questions[countryKey];
    if (!def) return set;
    var all = def.base.slice();
    Object.keys(def.follow || {}).forEach(function (k) { all = all.concat(def.follow[k]); });

    all.forEach(function (q) {
      var a = answers[q.id];
      if (a == null) return;
      var picked = Array.isArray(a) ? a : [a];
      picked.forEach(function (v) {
        if (v === '__other') { set.add('needs_review'); return; }
        var opt = null;
        for (var i = 0; i < q.opts.length; i++) { if (q.opts[i].v === v) { opt = q.opts[i]; break; } }
        if (opt && opt.tags) opt.tags.forEach(function (tg) { set.add(tg); });
      });
    });
    return set;
  }

  /* Which follow-up questions are unlocked by the answers so far. */
  function unlockedFollowups(countryKey, answers) {
    var def = window.TAXCAL_PLUS_Q.questions[countryKey];
    if (!def || !def.follow) return [];
    var tags = tagsFrom(countryKey, answers);
    var out = [], seen = {};
    Object.keys(def.follow).forEach(function (trigger) {
      if (!tags.has(trigger)) return;
      def.follow[trigger].forEach(function (q) { if (!seen[q.id]) { seen[q.id] = 1; out.push(q); } });
    });
    return out;
  }

  /* Run the rules. ctx must carry countryKey, gross, marginalRate, currency. */
  function evaluate(ctx, answers) {
    var rules = (RULES[ctx.countryKey] || []).concat(BASELINE[ctx.countryKey] || []);
    var tags = tagsFrom(ctx.countryKey, answers);
    var findings = [];

    rules.forEach(function (r) {
      var hit = false;
      // Baseline checks carry no `when` and always apply.
      try { hit = r.when ? !!r.when(tags, ctx) : true; } catch (e) { hit = false; }
      if (!hit) return;
      var val = null;
      try { val = r.value ? r.value(ctx) : null; } catch (e) { val = null; }
      findings.push({
        id: r.id,
        title: r.title,
        why: r.why,
        action: r.action,
        basis: r.basis,
        caveat: r.caveat,
        confidence: r.confidence,
        value: (typeof val === 'number' && isFinite(val) && val > 0) ? val : null,
        priority: r.priority || 0
      });
    });

    // Rank by estimated value first, then by the rule's own priority. Findings
    // we cannot price still matter, so they sort by priority among themselves
    // rather than falling to the bottom.
    findings.sort(function (a, b) {
      if (a.value != null && b.value != null && a.value !== b.value) return b.value - a.value;
      if (a.value != null && b.value == null) return -1;
      if (a.value == null && b.value != null) return 1;
      return b.priority - a.priority;
    });

    var total = findings.reduce(function (s, f) { return s + (f.value || 0); }, 0);

    /* Verdict drives what we say to someone who has already paid.
       "thin" is not a failure of the product — it means this person is already
       well organised, and saying so plainly is the only defensible response.
       Manufacturing findings to justify a fee is exactly what we will not do. */
    var ratio = ctx.gross > 0 ? total / ctx.gross : 0;
    var verdict = 'thin';
    if (ratio >= 0.03 || total >= 2000) verdict = 'strong';
    else if (ratio >= 0.01 || total >= 500) verdict = 'moderate';

    return {
      findings: findings,
      quantifiedTotal: total,
      quantifiedCount: findings.filter(function (f) { return f.value != null; }).length,
      verdict: verdict,
      // True when we owe the customer an honest "we did not find much" message,
      // and — per our own refund promise — an offer to refund.
      shouldOfferRefund: verdict === 'thin',
      needsReview: tags.has('needs_review'),
      unknowns: Array.from(tags).filter(function (t) { return /unknown$/.test(t) || t === 'unknown'; }),
      tags: Array.from(tags)
    };
  }

  return {
    evaluate: evaluate,
    tagsFrom: tagsFrom,
    unlockedFollowups: unlockedFollowups,
    limits: LIMITS,
    rules: RULES
  };
})();
