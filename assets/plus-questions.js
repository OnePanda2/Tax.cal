/* ============================================================================
   Tax.cal Plus — questionnaire definitions.

   One bespoke set per country. Nothing here is universal: the questions, the
   wording and the options all use the vocabulary of that country's own system,
   because someone who has just paid should feel the product was built for them.

   Shape per country:
     base[]    the five questions everyone in that country answers
     follow{}  extra questions, keyed by the tag that unlocks them

   Options carry `tags`. The engine reasons over tags only, never over display
   text, so wording can change freely without breaking any rule.

   Every question gets an "Other" escape hatch appended by the UI. Nobody is
   ever forced to type; anyone who needs to, can.
   ========================================================================== */
window.TAXCAL_PLUS_Q = (function () {
  'use strict';

  // Appended to every question by the UI.
  var OTHER = { v: '__other', label: 'Something else — let me explain', other: true, tags: ['needs_review'] };

  // "Not sure" is always allowed. Guessing would poison the output.
  function DK(tag) {
    return { v: 'dk', label: 'I am not sure', hint: 'We will treat this as unknown rather than assume.', tags: [tag || 'unknown'] };
  }

  var Q = {

    /* ---------------------------------------------------------------- UK -- */
    UK: {
      base: [
        { id: 'employment', type: 'single', q: 'How are you paid?',
          help: 'This decides more than anything else which allowances are open to you.',
          opts: [
            { v: 'paye', label: 'PAYE employee', hint: 'Tax comes off your payslip before you see it.', tags: ['paye'] },
            { v: 'sole', label: 'Self-employed (sole trader)', hint: 'You file a Self Assessment return.', tags: ['self_employed', 'files_sa'] },
            { v: 'ltd', label: 'Director of my own limited company', tags: ['ltd_director', 'files_sa'] },
            { v: 'both', label: 'PAYE job plus income on the side', tags: ['paye', 'side_income', 'files_sa'] },
            { v: 'umbrella', label: 'Umbrella or agency contractor', tags: ['paye', 'contractor'] }
          ] },
        { id: 'pension', type: 'single', q: 'What is happening with your pension right now?',
          help: 'Pension relief is the biggest legal lever in the UK — but only if you have room left.',
          opts: [
            { v: 'auto_min', label: 'Auto-enrolment minimum only', hint: 'The default 5% from you, 3% from your employer.', tags: ['pension_room', 'pension_low'] },
            { v: 'above_min', label: 'More than the minimum, but not the maximum', tags: ['pension_room'] },
            { v: 'sacrifice', label: 'Salary sacrifice arrangement', hint: 'Contributions come out before National Insurance.', tags: ['salary_sacrifice'] },
            { v: 'maxed', label: 'I already use my full annual allowance', tags: ['pension_maxed'] },
            { v: 'none', label: 'I have no pension at all', tags: ['pension_room', 'pension_none'] },
            DK('pension_unknown')
          ] },
        { id: 'other_income', type: 'multi', q: 'Do you have income from any of these?',
          help: 'Pick everything that applies. Each has its own allowance people routinely miss.',
          opts: [
            { v: 'rental', label: 'Renting out property', tags: ['rental'] },
            { v: 'dividends', label: 'Dividends from shares', tags: ['dividends'] },
            { v: 'savings', label: 'Savings interest', tags: ['savings_interest'] },
            { v: 'side', label: 'A side business or freelancing', tags: ['side_income'] },
            { v: 'crypto', label: 'Crypto or shares I have sold', tags: ['cgt'] },
            { v: 'none', label: 'None — just my main income', tags: ['income_simple'] }
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          help: 'Some UK allowances move between partners; some are clawed back because of children.',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'couple_both', label: 'Married or civil partners, both earning similar', tags: ['married'] },
            { v: 'couple_uneven', label: 'Married or civil partners, one earns much less', tags: ['married', 'uneven_income'] },
            { v: 'kids', label: 'I have children under 16 (or under 20 in education)', tags: ['children'] },
            { v: 'couple_kids', label: 'Married or civil partners, with children', tags: ['married', 'children'] },
            { v: 'cohabit', label: 'Living with a partner, not married', tags: ['cohabiting'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          help: 'These are the reliefs most often left unclaimed. Tick anything true.',
          opts: [
            { v: 'student_loan', label: 'I am repaying a student loan', tags: ['student_loan'] },
            { v: 'charity', label: 'I give to charity', tags: ['gift_aid'] },
            { v: 'wfh', label: 'I work from home at least part of the week', tags: ['wfh'] },
            { v: 'prof', label: 'I pay professional fees or subscriptions for work', tags: ['prof_fees'] },
            { v: 'own_kit', label: 'I buy my own tools, kit or uniform for work', tags: ['work_expenses'] },
            { v: 'mortgage', label: 'I have a mortgage', tags: ['mortgage'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        ltd_director: [{ id: 'uk_ltd_split', type: 'single', q: 'How do you pay yourself out of the company?',
          help: 'The salary and dividend mix is usually where the money is.',
          opts: [
            { v: 'salary_only', label: 'All salary', tags: ['ltd_salary_only'] },
            { v: 'mixed', label: 'A small salary plus dividends', tags: ['ltd_mixed'] },
            { v: 'divi_only', label: 'Mostly dividends', tags: ['ltd_divi'] },
            DK()
          ] }],
        self_employed: [{ id: 'uk_expenses', type: 'single', q: 'How do you handle business expenses?',
          help: 'Unclaimed expenses are the most common overpayment in self-employment.',
          opts: [
            { v: 'thorough', label: 'I track everything carefully', tags: ['expenses_good'] },
            { v: 'some', label: 'I claim the obvious ones only', tags: ['expenses_partial'] },
            { v: 'none', label: 'I do not really claim expenses', tags: ['expenses_none'] },
            DK()
          ] }],
        children: [{ id: 'uk_child_benefit', type: 'single', q: 'Are you or your partner claiming Child Benefit?',
          help: 'Above a certain income it is partly clawed back — but opting out entirely can cost National Insurance credits.',
          opts: [
            { v: 'claiming', label: 'Yes, we claim and receive it', tags: ['cb_claiming'] },
            { v: 'opted_out', label: 'We opted out of the payments', tags: ['cb_opted_out'] },
            { v: 'never', label: 'We never claimed it', tags: ['cb_never'] },
            DK()
          ] }],
        uneven_income: [{ id: 'uk_marriage_allowance', type: 'single', q: 'Does the lower-earning partner earn under the personal allowance?',
          help: 'If so, they may be able to transfer part of their unused allowance to you.',
          opts: [
            { v: 'yes', label: 'Yes, under roughly £12,570', tags: ['marriage_allowance_eligible'] },
            { v: 'no', label: 'No, they earn more than that', tags: [] },
            DK()
          ] }],
        rental: [{ id: 'uk_rental_own', type: 'single', q: 'How is the rental property owned?',
          help: 'Ownership structure changes how finance-cost relief works.',
          opts: [
            { v: 'sole', label: 'In my name only', tags: ['rental_sole'] },
            { v: 'joint', label: 'Jointly with my partner', tags: ['rental_joint'] },
            { v: 'company', label: 'Through a company', tags: ['rental_company'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- US -- */
    US: {
      base: [
        { id: 'employment', type: 'single', q: 'How are you paid?',
          help: 'W-2 and 1099 income open completely different doors.',
          opts: [
            { v: 'w2', label: 'W-2 employee', tags: ['w2'] },
            { v: 'c1099', label: '1099 contractor', tags: ['self_employed', 'se_tax'] },
            { v: 'business', label: 'I own a business (sole prop or LLC)', tags: ['self_employed', 'se_tax', 'business_owner'] },
            { v: 'scorp', label: 'S-corp owner', tags: ['scorp', 'business_owner'] },
            { v: 'both', label: 'W-2 job plus 1099 or side income', tags: ['w2', 'side_income', 'se_tax'] }
          ] },
        { id: 'retirement', type: 'single', q: 'Where are you with retirement accounts?',
          help: 'An employer match you are not capturing is the closest thing to free money in the tax code.',
          opts: [
            { v: 'match_full', label: 'I contribute enough to get the full employer match', tags: ['match_captured', 'retire_room'] },
            { v: 'match_partial', label: 'I contribute, but probably not enough for the full match', tags: ['match_missed', 'retire_room'] },
            { v: 'maxed', label: 'I max out my 401(k) every year', tags: ['retire_maxed'] },
            { v: 'ira_only', label: 'I only have an IRA', tags: ['retire_room', 'ira_only'] },
            { v: 'none', label: 'I have no retirement account', tags: ['retire_room', 'retire_none'] },
            DK('retire_unknown')
          ] },
        { id: 'health', type: 'single', q: 'What kind of health plan are you on?',
          help: 'An HSA is the only triple-tax-free account in the US system, and most eligible people never open one.',
          opts: [
            { v: 'hdhp_hsa', label: 'High-deductible plan, and I have an HSA', tags: ['hsa_active'] },
            { v: 'hdhp_no_hsa', label: 'High-deductible plan, but no HSA', tags: ['hsa_eligible_unused'] },
            { v: 'traditional', label: 'A traditional (non-HDHP) plan', tags: ['no_hsa'] },
            { v: 'fsa', label: 'I have an FSA through work', tags: ['fsa'] },
            { v: 'none', label: 'No coverage through work', tags: ['no_employer_health'] },
            DK('health_unknown')
          ] },
        { id: 'household', type: 'single', q: 'How will you file this year?',
          help: 'Filing status changes your brackets, your standard deduction and your credit eligibility.',
          opts: [
            { v: 'single', label: 'Single', tags: ['single'] },
            { v: 'mfj', label: 'Married filing jointly', tags: ['married', 'mfj'] },
            { v: 'mfs', label: 'Married filing separately', tags: ['married', 'mfs'] },
            { v: 'hoh', label: 'Head of household', tags: ['hoh'] },
            { v: 'mfj_kids', label: 'Married filing jointly, with dependants', tags: ['married', 'mfj', 'children'] },
            { v: 'single_kids', label: 'Single or head of household, with dependants', tags: ['hoh', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          help: 'Several of these decide whether itemizing beats the standard deduction.',
          opts: [
            { v: 'mortgage', label: 'I pay mortgage interest', tags: ['mortgage', 'itemize_candidate'] },
            { v: 'charity', label: 'I donate to charity', tags: ['charity', 'itemize_candidate'] },
            { v: 'student_loan', label: 'I pay student loan interest', tags: ['student_loan'] },
            { v: 'rsu', label: 'I get RSUs, ESPP or stock options', tags: ['equity_comp'] },
            { v: 'rental', label: 'I own a rental property', tags: ['rental'] },
            { v: 'childcare', label: 'I pay for childcare or dependent care', tags: ['childcare'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        self_employed: [
          { id: 'us_se_retirement', type: 'single', q: 'Do you use a self-employed retirement plan?',
            help: 'These have far higher limits than a personal IRA.',
            opts: [
              { v: 'solo401k', label: 'Yes, a Solo 401(k)', tags: ['solo401k'] },
              { v: 'sep', label: 'Yes, a SEP-IRA', tags: ['sep_ira'] },
              { v: 'no', label: 'No, neither', tags: ['se_retire_room'] },
              DK()
            ] },
          { id: 'us_home_office', type: 'single', q: 'Do you work from a dedicated space at home?',
            opts: [
              { v: 'dedicated', label: 'Yes, a room or area used only for work', tags: ['home_office'] },
              { v: 'shared', label: 'I work at home but the space is shared', tags: ['home_office_shared'] },
              { v: 'no', label: 'No, I work elsewhere', tags: [] },
              DK()
            ] }
        ],
        equity_comp: [{ id: 'us_equity', type: 'single', q: 'How do you handle your stock compensation?',
          help: 'Holding periods decide whether gains are taxed as income or at long-term rates.',
          opts: [
            { v: 'sell_now', label: 'I sell as soon as it vests', tags: ['equity_sell_now'] },
            { v: 'hold', label: 'I hold for a while', tags: ['equity_hold'] },
            { v: 'mixed', label: 'A bit of both', tags: ['equity_mixed'] },
            DK()
          ] }],
        children: [{ id: 'us_529', type: 'single', q: 'Do you save for your children’s education?',
          help: 'Many states add a deduction or credit for 529 contributions on top of the federal treatment.',
          opts: [
            { v: 'yes529', label: 'Yes, in a 529 plan', tags: ['plan529'] },
            { v: 'other', label: 'Yes, but not in a 529', tags: ['saving_not_529'] },
            { v: 'no', label: 'Not yet', tags: ['no_529'] },
            DK()
          ] }],
        match_missed: [{ id: 'us_match', type: 'single', q: 'Do you know what your employer match is?',
          help: 'Leaving a match unclaimed is a guaranteed loss, not a tax question.',
          opts: [
            { v: 'know', label: 'Yes, I know the percentage', tags: ['match_known'] },
            { v: 'unsure', label: 'I know there is one, but not the details', tags: ['match_unclear'] },
            { v: 'none', label: 'My employer does not match', tags: ['no_match'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- CA -- */
    CA: {
      base: [
        { id: 'employment', type: 'single', q: 'How are you paid?',
          help: 'Employment type decides which deductions the CRA will accept from you.',
          opts: [
            { v: 't4', label: 'T4 employee', tags: ['employee'] },
            { v: 'self', label: 'Self-employed or freelance', tags: ['self_employed'] },
            { v: 'inc', label: 'Through my own corporation', tags: ['incorporated', 'business_owner'] },
            { v: 'both', label: 'T4 job plus self-employed income', tags: ['employee', 'side_income', 'self_employed'] },
            { v: 'commission', label: 'Commission-based employee', tags: ['employee', 'commission'] }
          ] },
        { id: 'registered', type: 'single', q: 'How are you using your registered accounts?',
          help: 'RRSP room carries forward, so unused room from past years is often the biggest single opportunity.',
          opts: [
            { v: 'rrsp_max', label: 'I max my RRSP each year', tags: ['rrsp_maxed'] },
            { v: 'rrsp_some', label: 'I contribute some, with room left over', tags: ['rrsp_room'] },
            { v: 'tfsa_only', label: 'I use a TFSA but not an RRSP', tags: ['rrsp_room', 'tfsa_only'] },
            { v: 'neither', label: 'Neither, really', tags: ['rrsp_room', 'tfsa_room'] },
            { v: 'both_max', label: 'I max both RRSP and TFSA', tags: ['rrsp_maxed', 'tfsa_maxed'] },
            DK('registered_unknown')
          ] },
        { id: 'other_income', type: 'multi', q: 'Do you have income from any of these?',
          opts: [
            { v: 'rental', label: 'A rental property', tags: ['rental'] },
            { v: 'dividends', label: 'Dividends from Canadian companies', tags: ['dividends_cdn'] },
            { v: 'capital', label: 'Investments I have sold', tags: ['cgt'] },
            { v: 'side', label: 'Side or gig work', tags: ['side_income'] },
            { v: 'foreign', label: 'Income from outside Canada', tags: ['foreign_income'] },
            { v: 'none', label: 'None — just my main income', tags: ['income_simple'] }
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          help: 'Several Canadian credits can be moved to whichever partner benefits more.',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'couple_both', label: 'Married or common-law, both earning similar', tags: ['married'] },
            { v: 'couple_uneven', label: 'Married or common-law, one earns much less', tags: ['married', 'uneven_income'] },
            { v: 'kids', label: 'Single parent with children', tags: ['children', 'single_parent'] },
            { v: 'couple_kids', label: 'Married or common-law, with children', tags: ['married', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          opts: [
            { v: 'first_home', label: 'I am saving for my first home', tags: ['fhsa_candidate'] },
            { v: 'childcare', label: 'I pay childcare costs', tags: ['childcare'] },
            { v: 'moved', label: 'I moved for work or study this year', tags: ['moving_expenses'] },
            { v: 'union', label: 'I pay union or professional dues', tags: ['union_dues'] },
            { v: 'medical', label: 'I had significant medical expenses', tags: ['medical'] },
            { v: 'student', label: 'I am repaying or paying tuition', tags: ['tuition'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        self_employed: [{ id: 'ca_expenses', type: 'single', q: 'How do you handle business expenses?',
          opts: [
            { v: 'thorough', label: 'I track everything carefully', tags: ['expenses_good'] },
            { v: 'some', label: 'I claim the obvious ones only', tags: ['expenses_partial'] },
            { v: 'none', label: 'I do not really claim expenses', tags: ['expenses_none'] },
            DK()
          ] }],
        uneven_income: [{ id: 'ca_spousal', type: 'single', q: 'Do you use a spousal RRSP?',
          help: 'It shifts future retirement income to the lower-earning partner.',
          opts: [
            { v: 'yes', label: 'Yes, we already do', tags: ['spousal_rrsp'] },
            { v: 'no', label: 'No', tags: ['spousal_rrsp_candidate'] },
            DK()
          ] }],
        fhsa_candidate: [{ id: 'ca_fhsa', type: 'single', q: 'Have you opened an FHSA?',
          help: 'It is the only Canadian account that is deductible going in and tax-free coming out.',
          opts: [
            { v: 'yes', label: 'Yes, and I contribute', tags: ['fhsa_open'] },
            { v: 'opened', label: 'Opened it but have not contributed', tags: ['fhsa_idle'] },
            { v: 'no', label: 'No', tags: ['fhsa_unused'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- AU -- */
    AU: {
      base: [
        { id: 'employment', type: 'single', q: 'How are you paid?',
          opts: [
            { v: 'employee', label: 'Employee (PAYG)', tags: ['employee'] },
            { v: 'sole', label: 'Sole trader with an ABN', tags: ['self_employed'] },
            { v: 'contractor', label: 'Contractor', tags: ['self_employed', 'contractor'] },
            { v: 'company', label: 'Through my own company or trust', tags: ['incorporated', 'business_owner'] },
            { v: 'both', label: 'A job plus ABN income on the side', tags: ['employee', 'side_income', 'self_employed'] }
          ] },
        { id: 'super', type: 'single', q: 'What are you doing with super?',
          help: 'Concessional contributions are taxed at 15% instead of your marginal rate, and unused caps can carry forward.',
          opts: [
            { v: 'sg_only', label: 'Just the employer guarantee', tags: ['super_room', 'super_low'] },
            { v: 'sacrifice', label: 'I salary sacrifice extra', tags: ['super_sacrifice', 'super_room'] },
            { v: 'personal', label: 'I make personal deductible contributions', tags: ['super_personal'] },
            { v: 'maxed', label: 'I use my full concessional cap', tags: ['super_maxed'] },
            { v: 'carry', label: 'I have unused cap from earlier years', tags: ['super_carry_forward', 'super_room'] },
            DK('super_unknown')
          ] },
        { id: 'other_income', type: 'multi', q: 'Do you have income from any of these?',
          opts: [
            { v: 'rental', label: 'An investment property', tags: ['rental', 'negative_gearing'] },
            { v: 'dividends', label: 'Australian shares paying dividends', tags: ['franking_credits'] },
            { v: 'capital', label: 'Investments I have sold', tags: ['cgt'] },
            { v: 'side', label: 'Side or gig work', tags: ['side_income'] },
            { v: 'crypto', label: 'Crypto', tags: ['cgt', 'crypto'] },
            { v: 'none', label: 'None — just my main income', tags: ['income_simple'] }
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          help: 'Private health cover and several offsets are assessed on combined household income.',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'couple', label: 'Couple, both earning similar', tags: ['married'] },
            { v: 'couple_uneven', label: 'Couple, one earns much less', tags: ['married', 'uneven_income'] },
            { v: 'kids', label: 'With dependent children', tags: ['children'] },
            { v: 'couple_kids', label: 'Couple with dependent children', tags: ['married', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          opts: [
            { v: 'private_health', label: 'I have private hospital cover', tags: ['private_health'] },
            { v: 'no_health', label: 'I have no private hospital cover', tags: ['no_private_health'] },
            { v: 'help', label: 'I am repaying HECS-HELP', tags: ['help_debt'] },
            { v: 'wfh', label: 'I work from home regularly', tags: ['wfh'] },
            { v: 'car', label: 'I use my own car for work', tags: ['car_expenses'] },
            { v: 'tools', label: 'I buy my own tools or equipment for work', tags: ['work_expenses'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        no_private_health: [{ id: 'au_mls', type: 'single', q: 'Roughly what is your household income?',
          help: 'Above a threshold, going without hospital cover triggers an extra Medicare levy that often costs more than a basic policy.',
          opts: [
            { v: 'under', label: 'Under about $97,000 single / $194,000 couple', tags: ['mls_under'] },
            { v: 'over', label: 'Above that', tags: ['mls_exposed'] },
            DK()
          ] }],
        negative_gearing: [{ id: 'au_property', type: 'single', q: 'Is the property positively or negatively geared?',
          opts: [
            { v: 'negative', label: 'Costs exceed the rent (negatively geared)', tags: ['neg_geared'] },
            { v: 'positive', label: 'Rent exceeds the costs', tags: ['pos_geared'] },
            DK()
          ] }],
        self_employed: [{ id: 'au_expenses', type: 'single', q: 'How do you handle business deductions?',
          opts: [
            { v: 'thorough', label: 'I track everything carefully', tags: ['expenses_good'] },
            { v: 'some', label: 'I claim the obvious ones only', tags: ['expenses_partial'] },
            { v: 'none', label: 'I do not really claim deductions', tags: ['expenses_none'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- IE -- */
    IE: {
      base: [
        { id: 'employment', type: 'single', q: 'How are you paid?',
          opts: [
            { v: 'paye', label: 'PAYE employee', tags: ['paye'] },
            { v: 'self', label: 'Self-employed', tags: ['self_employed', 'files_return'] },
            { v: 'prop_director', label: 'Proprietary director of my own company', tags: ['prop_director', 'files_return'] },
            { v: 'both', label: 'PAYE job plus income on the side', tags: ['paye', 'side_income', 'files_return'] }
          ] },
        { id: 'pension', type: 'single', q: 'What is happening with your pension?',
          help: 'Irish pension relief is age-banded — the older you are, the more of your salary qualifies.',
          opts: [
            { v: 'none', label: 'I have no pension', tags: ['pension_room', 'pension_none'] },
            { v: 'employer', label: 'Employer scheme, minimum contribution', tags: ['pension_room', 'pension_low'] },
            { v: 'avc', label: 'I pay AVCs on top', tags: ['pension_avc'] },
            { v: 'maxed', label: 'I contribute the maximum for my age band', tags: ['pension_maxed'] },
            DK('pension_unknown')
          ] },
        { id: 'other_income', type: 'multi', q: 'Do you have income from any of these?',
          opts: [
            { v: 'rental', label: 'Renting out property', tags: ['rental'] },
            { v: 'dividends', label: 'Dividends or investments', tags: ['dividends'] },
            { v: 'side', label: 'A side business or freelancing', tags: ['side_income'] },
            { v: 'foreign', label: 'Income from outside Ireland', tags: ['foreign_income'] },
            { v: 'none', label: 'None — just my main income', tags: ['income_simple'] }
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          help: 'Married couples can choose how the standard rate band is split, which often cuts the total bill.',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'couple_both', label: 'Married or civil partners, both earning similar', tags: ['married'] },
            { v: 'couple_uneven', label: 'Married or civil partners, one earns much less', tags: ['married', 'uneven_income'] },
            { v: 'one_income', label: 'Married, one of us stays at home', tags: ['married', 'home_carer'] },
            { v: 'single_parent', label: 'Single parent', tags: ['children', 'single_parent'] },
            { v: 'couple_kids', label: 'Married or civil partners, with children', tags: ['married', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          help: 'Irish credits are claimed, not given automatically — these are the ones most often missed.',
          opts: [
            { v: 'rent', label: 'I pay rent on my home', tags: ['rent_credit'] },
            { v: 'medical', label: 'I paid medical or dental expenses', tags: ['medical'] },
            { v: 'tuition', label: 'I paid third-level tuition fees', tags: ['tuition'] },
            { v: 'wfh', label: 'I work from home regularly', tags: ['wfh'] },
            { v: 'mortgage', label: 'I have a mortgage', tags: ['mortgage'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        self_employed: [{ id: 'ie_expenses', type: 'single', q: 'How do you handle business expenses?',
          opts: [
            { v: 'thorough', label: 'I track everything carefully', tags: ['expenses_good'] },
            { v: 'some', label: 'I claim the obvious ones only', tags: ['expenses_partial'] },
            { v: 'none', label: 'I do not really claim expenses', tags: ['expenses_none'] },
            DK()
          ] }],
        medical: [{ id: 'ie_medical_claimed', type: 'single', q: 'Have you claimed relief on those medical expenses?',
          help: 'Relief is worth 20% of qualifying costs and can be backdated four years.',
          opts: [
            { v: 'yes', label: 'Yes, every year', tags: ['medical_claimed'] },
            { v: 'sometimes', label: 'Sometimes, not consistently', tags: ['medical_partial'] },
            { v: 'no', label: 'No, never', tags: ['medical_unclaimed'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- DE -- */
    DE: {
      base: [
        { id: 'employment', type: 'single', q: 'Wie werden Sie bezahlt? / How are you paid?',
          help: 'Employment type decides which costs the Finanzamt will accept.',
          opts: [
            { v: 'angestellt', label: 'Angestellt — employee', tags: ['employee'] },
            { v: 'selbst', label: 'Selbstständig — self-employed', tags: ['self_employed'] },
            { v: 'frei', label: 'Freiberufler — freelance professional', tags: ['self_employed', 'freiberufler'] },
            { v: 'beamter', label: 'Beamter — civil servant', tags: ['employee', 'beamter'] },
            { v: 'both', label: 'Employed plus something on the side', tags: ['employee', 'side_income'] }
          ] },
        { id: 'steuerklasse', type: 'single', q: 'Which Steuerklasse (tax class) are you in?',
          help: 'For married couples the class combination changes take-home pay immediately — it is the fastest lever in the German system.',
          opts: [
            { v: 'k1', label: 'Klasse I — single', tags: ['stk1', 'single'] },
            { v: 'k3', label: 'Klasse III — married, I earn more', tags: ['stk3', 'married'] },
            { v: 'k4', label: 'Klasse IV — married, both similar', tags: ['stk4', 'married'] },
            { v: 'k5', label: 'Klasse V — married, I earn less', tags: ['stk5', 'married'] },
            { v: 'k2', label: 'Klasse II — single parent', tags: ['stk2', 'single_parent', 'children'] },
            DK('steuerklasse_unknown')
          ] },
        { id: 'vorsorge', type: 'single', q: 'What retirement provision do you have beyond the state system?',
          help: 'Rürup and company schemes reduce taxable income directly; Riester works through allowances.',
          opts: [
            { v: 'none', label: 'Nothing beyond the statutory pension', tags: ['vorsorge_room', 'vorsorge_none'] },
            { v: 'riester', label: 'A Riester plan', tags: ['riester'] },
            { v: 'ruerup', label: 'A Rürup (Basisrente) plan', tags: ['ruerup', 'vorsorge_room'] },
            { v: 'bav', label: 'A company scheme (betriebliche Altersvorsorge)', tags: ['bav'] },
            { v: 'multiple', label: 'More than one of these', tags: ['vorsorge_good'] },
            DK('vorsorge_unknown')
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          help: 'Ehegattensplitting can be worth a great deal when incomes are uneven.',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'couple_both', label: 'Married, both earning similar', tags: ['married'] },
            { v: 'couple_uneven', label: 'Married, one earns much less', tags: ['married', 'uneven_income'] },
            { v: 'kids', label: 'With children', tags: ['children'] },
            { v: 'couple_kids', label: 'Married, with children', tags: ['married', 'children'] },
            { v: 'single_parent', label: 'Single parent', tags: ['single_parent', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          help: 'Most people simply take the lump-sum allowance and never check whether their real costs exceed it.',
          opts: [
            { v: 'commute', label: 'I commute a meaningful distance to work', tags: ['pendler'] },
            { v: 'wfh', label: 'I work from home regularly', tags: ['homeoffice'] },
            { v: 'zweit', label: 'I keep a second home for work', tags: ['doppelte_haushalt'] },
            { v: 'fortbildung', label: 'I paid for training or professional development', tags: ['fortbildung'] },
            { v: 'handwerker', label: 'I paid tradespeople for work on my home', tags: ['handwerkerleistungen'] },
            { v: 'spenden', label: 'I donate to charity', tags: ['spenden'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        uneven_income: [{ id: 'de_klassenwahl', type: 'single', q: 'Have you ever reviewed your tax class combination?',
          help: 'III/V versus IV/IV with factor can change monthly take-home substantially.',
          opts: [
            { v: 'reviewed', label: 'Yes, we chose it deliberately', tags: ['stk_reviewed'] },
            { v: 'default', label: 'No, we just kept what we were given', tags: ['stk_unreviewed'] },
            DK()
          ] }],
        self_employed: [{ id: 'de_expenses', type: 'single', q: 'How do you handle Betriebsausgaben?',
          opts: [
            { v: 'thorough', label: 'I track everything carefully', tags: ['expenses_good'] },
            { v: 'some', label: 'I claim the obvious ones only', tags: ['expenses_partial'] },
            { v: 'none', label: 'I do not really claim them', tags: ['expenses_none'] },
            DK()
          ] }],
        pendler: [{ id: 'de_commute', type: 'single', q: 'Roughly how far is your commute, one way?',
          help: 'The Pendlerpauschale is per kilometre, per working day — it adds up faster than people expect.',
          opts: [
            { v: 'short', label: 'Under 10 km', tags: ['commute_short'] },
            { v: 'medium', label: '10 to 30 km', tags: ['commute_medium'] },
            { v: 'long', label: 'More than 30 km', tags: ['commute_long'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- FR -- */
    FR: {
      base: [
        { id: 'employment', type: 'single', q: 'Comment êtes-vous rémunéré ? / How are you paid?',
          opts: [
            { v: 'salarie', label: 'Salarié — employee', tags: ['employee'] },
            { v: 'independant', label: 'Indépendant — self-employed', tags: ['self_employed'] },
            { v: 'auto', label: 'Auto-entrepreneur / micro-entreprise', tags: ['self_employed', 'micro'] },
            { v: 'dirigeant', label: 'Company director', tags: ['business_owner'] },
            { v: 'both', label: 'Salaried plus something on the side', tags: ['employee', 'side_income'] }
          ] },
        { id: 'per', type: 'single', q: 'Do you pay into a PER (plan d’épargne retraite)?',
          help: 'PER contributions come off your taxable income at your top rate — the main deduction lever in France.',
          opts: [
            { v: 'none', label: 'No, nothing', tags: ['per_room', 'per_none'] },
            { v: 'some', label: 'Yes, but modestly', tags: ['per_room'] },
            { v: 'maxed', label: 'Yes, up to my ceiling', tags: ['per_maxed'] },
            { v: 'company', label: 'Only through a company scheme', tags: ['per_company', 'per_room'] },
            DK('per_unknown')
          ] },
        { id: 'other_income', type: 'multi', q: 'Do you have income from any of these?',
          opts: [
            { v: 'rental', label: 'Rental property', tags: ['rental'] },
            { v: 'dividends', label: 'Dividends or investments', tags: ['dividends'] },
            { v: 'side', label: 'Freelance or side work', tags: ['side_income'] },
            { v: 'foreign', label: 'Income from outside France', tags: ['foreign_income'] },
            { v: 'none', label: 'None — just my main income', tags: ['income_simple'] }
          ] },
        { id: 'household', type: 'single', q: 'What is your foyer fiscal (household for tax)?',
          help: 'France taxes the household and divides by parts — children literally lower your rate.',
          opts: [
            { v: 'single', label: 'Single, no children — 1 part', tags: ['single'] },
            { v: 'couple', label: 'Married or PACS, no children', tags: ['married'] },
            { v: 'couple_1', label: 'Couple with one child', tags: ['married', 'children'] },
            { v: 'couple_2', label: 'Couple with two or more children', tags: ['married', 'children', 'children_many'] },
            { v: 'single_parent', label: 'Single parent', tags: ['single_parent', 'children'] },
            { v: 'concubinage', label: 'Living together, not married or PACS', tags: ['cohabiting'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          help: 'Several French reliefs are credits, meaning you get the money even if you owe no tax.',
          opts: [
            { v: 'garde', label: 'I pay for childcare', tags: ['garde_enfants'] },
            { v: 'domicile', label: 'I pay for help at home (cleaning, gardening, tutoring)', tags: ['services_personne'] },
            { v: 'dons', label: 'I donate to charity', tags: ['dons'] },
            { v: 'travaux', label: 'I paid for energy-efficiency work on my home', tags: ['renovation'] },
            { v: 'pension_alim', label: 'I pay maintenance to a relative', tags: ['pension_alimentaire'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        services_personne: [{ id: 'fr_sap', type: 'single', q: 'Do you declare that home help for the tax credit?',
          help: 'It is a 50% credit on qualifying spend, up to a ceiling — routinely unclaimed when paid informally.',
          opts: [
            { v: 'yes', label: 'Yes, always', tags: ['sap_claimed'] },
            { v: 'sometimes', label: 'Sometimes', tags: ['sap_partial'] },
            { v: 'no', label: 'No', tags: ['sap_unclaimed'] },
            DK()
          ] }],
        self_employed: [{ id: 'fr_regime', type: 'single', q: 'Which regime are you on?',
          help: 'Micro gives a flat allowance; réel deducts actual costs. The better choice depends on your real expenses.',
          opts: [
            { v: 'micro', label: 'Micro (flat-rate allowance)', tags: ['regime_micro'] },
            { v: 'reel', label: 'Réel (actual expenses)', tags: ['regime_reel'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- NL -- */
    NL: {
      base: [
        { id: 'employment', type: 'single', q: 'How are you paid?',
          opts: [
            { v: 'employee', label: 'Employee (loondienst)', tags: ['employee'] },
            { v: 'zzp', label: 'ZZP — self-employed', tags: ['self_employed', 'zzp'] },
            { v: 'bv', label: 'Through my own BV', tags: ['business_owner'] },
            { v: 'both', label: 'Employed plus ZZP income', tags: ['employee', 'side_income', 'self_employed'] }
          ] },
        { id: 'ruling', type: 'single', q: 'Are you on the 30% ruling?',
          help: 'For people who moved to the Netherlands for work this is by far the largest single item.',
          opts: [
            { v: 'yes', label: 'Yes, I have it', tags: ['ruling_active'] },
            { v: 'expired', label: 'I had it, it has ended', tags: ['ruling_expired'] },
            { v: 'no_moved', label: 'No, but I did move here for work', tags: ['ruling_candidate'] },
            { v: 'no_dutch', label: 'No — I have always lived here', tags: ['no_ruling'] },
            DK('ruling_unknown')
          ] },
        { id: 'pension', type: 'single', q: 'What is happening with your pension?',
          opts: [
            { v: 'employer', label: 'Employer scheme only', tags: ['pension_employer'] },
            { v: 'extra', label: 'Employer scheme plus my own contributions', tags: ['pension_extra'] },
            { v: 'lijfrente', label: 'I use a lijfrente (annuity) product', tags: ['lijfrente'] },
            { v: 'none', label: 'Nothing at all', tags: ['pension_room', 'pension_none'] },
            DK('pension_unknown')
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          help: 'Fiscal partners can allocate several deductions to whoever benefits more.',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'partner_both', label: 'Fiscal partners, both earning similar', tags: ['married', 'fiscal_partner'] },
            { v: 'partner_uneven', label: 'Fiscal partners, one earns much less', tags: ['married', 'fiscal_partner', 'uneven_income'] },
            { v: 'kids', label: 'With children', tags: ['children'] },
            { v: 'partner_kids', label: 'Fiscal partners with children', tags: ['married', 'fiscal_partner', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          opts: [
            { v: 'mortgage', label: 'I own my home with a mortgage', tags: ['mortgage', 'hypotheekrente'] },
            { v: 'savings', label: 'I have substantial savings or investments', tags: ['box3'] },
            { v: 'study', label: 'I paid for study or training', tags: ['study_costs'] },
            { v: 'gifts', label: 'I donate to charity', tags: ['giften'] },
            { v: 'healthcare', label: 'I had significant healthcare costs', tags: ['zorgkosten'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        ruling_candidate: [{ id: 'nl_ruling_when', type: 'single', q: 'When did you move to the Netherlands?',
          help: 'The ruling must normally be applied for within months of starting work, but it is worth checking.',
          opts: [
            { v: 'recent', label: 'Within the last year', tags: ['ruling_check_urgent'] },
            { v: 'few', label: 'One to five years ago', tags: ['ruling_check'] },
            { v: 'long', label: 'More than five years ago', tags: ['ruling_late'] },
            DK()
          ] }],
        self_employed: [{ id: 'nl_zzp_deductions', type: 'single', q: 'Do you claim the self-employed deductions?',
          help: 'Zelfstandigenaftrek and the starter deduction are claimed on your return, not automatically.',
          opts: [
            { v: 'yes', label: 'Yes, my accountant handles it', tags: ['zzp_deductions'] },
            { v: 'unsure', label: 'I think so, but I am not certain', tags: ['zzp_unclear'] },
            { v: 'no', label: 'No', tags: ['zzp_unclaimed'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- ES -- */
    ES: {
      base: [
        { id: 'employment', type: 'single', q: '¿Cómo cobra? / How are you paid?',
          opts: [
            { v: 'ajena', label: 'Empleado por cuenta ajena — employee', tags: ['employee'] },
            { v: 'autonomo', label: 'Autónomo — self-employed', tags: ['self_employed', 'autonomo'] },
            { v: 'societario', label: 'Through my own company', tags: ['business_owner'] },
            { v: 'both', label: 'Employed plus autónomo income', tags: ['employee', 'side_income', 'self_employed'] }
          ] },
        { id: 'pension', type: 'single', q: 'Do you pay into a pension plan?',
          help: 'The individual limit is low in Spain, but employer plans have a much higher ceiling.',
          opts: [
            { v: 'none', label: 'No', tags: ['pension_room', 'pension_none'] },
            { v: 'individual', label: 'An individual plan', tags: ['pension_individual'] },
            { v: 'empresa', label: 'A company plan (plan de empleo)', tags: ['pension_empresa'] },
            { v: 'both', label: 'Both', tags: ['pension_good'] },
            DK('pension_unknown')
          ] },
        { id: 'other_income', type: 'multi', q: 'Do you have income from any of these?',
          opts: [
            { v: 'rental', label: 'Renting out property', tags: ['rental'] },
            { v: 'dividends', label: 'Dividends or investments', tags: ['dividends'] },
            { v: 'side', label: 'Freelance or side work', tags: ['side_income'] },
            { v: 'foreign', label: 'Income from outside Spain', tags: ['foreign_income'] },
            { v: 'none', label: 'None — just my main income', tags: ['income_simple'] }
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          help: 'Spain lets couples choose joint or individual filing, and the better choice is not always obvious.',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'couple_both', label: 'Married, both earning similar', tags: ['married'] },
            { v: 'couple_uneven', label: 'Married, one earns much less', tags: ['married', 'uneven_income'] },
            { v: 'kids', label: 'With children under 25 at home', tags: ['children'] },
            { v: 'couple_kids', label: 'Married, with children', tags: ['married', 'children'] },
            { v: 'single_parent', label: 'Single parent', tags: ['single_parent', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          help: 'Your autonomous community adds its own deductions on top of the state ones.',
          opts: [
            { v: 'rent', label: 'I rent my home', tags: ['rent_deduction'] },
            { v: 'mortgage_old', label: 'I have a mortgage taken out before 2013', tags: ['mortgage_pre2013'] },
            { v: 'donations', label: 'I donate to charity', tags: ['donativos'] },
            { v: 'disability', label: 'Someone in my household has a recognised disability', tags: ['discapacidad'] },
            { v: 'childcare', label: 'I pay for nursery or childcare', tags: ['guarderia'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        autonomo: [{ id: 'es_autonomo_gastos', type: 'single', q: 'How do you handle deductible expenses?',
          opts: [
            { v: 'thorough', label: 'I track everything carefully', tags: ['expenses_good'] },
            { v: 'some', label: 'I claim the obvious ones only', tags: ['expenses_partial'] },
            { v: 'none', label: 'I do not really claim them', tags: ['expenses_none'] },
            DK()
          ] }],
        uneven_income: [{ id: 'es_conjunta', type: 'single', q: 'Do you file jointly or individually?',
          help: 'Joint filing usually wins when one partner earns little, individual when both earn well.',
          opts: [
            { v: 'conjunta', label: 'Jointly (declaración conjunta)', tags: ['filing_joint'] },
            { v: 'individual', label: 'Individually', tags: ['filing_individual'] },
            { v: 'never_compared', label: 'We have never compared the two', tags: ['filing_uncompared'] },
            DK()
          ] }]
      }
    },

    /* ---------------------------------------------------------------- IT -- */
    IT: {
      base: [
        { id: 'employment', type: 'single', q: 'Come viene pagato? / How are you paid?',
          opts: [
            { v: 'dipendente', label: 'Lavoratore dipendente — employee', tags: ['employee'] },
            { v: 'forfettario', label: 'Partita IVA, regime forfettario', tags: ['self_employed', 'forfettario'] },
            { v: 'ordinario', label: 'Partita IVA, regime ordinario', tags: ['self_employed', 'ordinario'] },
            { v: 'both', label: 'Employed plus partita IVA income', tags: ['employee', 'side_income', 'self_employed'] }
          ] },
        { id: 'pension', type: 'single', q: 'Do you pay into a fondo pensione?',
          help: 'Contributions are deductible up to a yearly ceiling, and many employees never open one at all.',
          opts: [
            { v: 'none', label: 'No', tags: ['pension_room', 'pension_none'] },
            { v: 'tfr_only', label: 'Only my TFR goes in', tags: ['pension_room', 'tfr_only'] },
            { v: 'some', label: 'Yes, I contribute as well', tags: ['pension_room'] },
            { v: 'maxed', label: 'Yes, up to the deductible ceiling', tags: ['pension_maxed'] },
            DK('pension_unknown')
          ] },
        { id: 'other_income', type: 'multi', q: 'Do you have income from any of these?',
          opts: [
            { v: 'rental', label: 'Renting out property', tags: ['rental', 'cedolare_candidate'] },
            { v: 'dividends', label: 'Dividends or investments', tags: ['dividends'] },
            { v: 'side', label: 'Freelance or side work', tags: ['side_income'] },
            { v: 'foreign', label: 'Income from outside Italy', tags: ['foreign_income'] },
            { v: 'none', label: 'None — just my main income', tags: ['income_simple'] }
          ] },
        { id: 'household', type: 'single', q: 'Which best describes your household?',
          opts: [
            { v: 'single', label: 'Single, no children', tags: ['single'] },
            { v: 'couple_both', label: 'Married, both earning similar', tags: ['married'] },
            { v: 'couple_uneven', label: 'Married, one earns much less', tags: ['married', 'uneven_income'] },
            { v: 'kids', label: 'With dependent children', tags: ['children'] },
            { v: 'couple_kids', label: 'Married, with dependent children', tags: ['married', 'children'] },
            { v: 'single_parent', label: 'Single parent', tags: ['single_parent', 'children'] }
          ] },
        { id: 'situation', type: 'multi', q: 'Which of these apply to you?',
          help: 'Italian detrazioni are claimed with receipts — traceable payment is usually required.',
          opts: [
            { v: 'medical', label: 'I paid medical or dental expenses', tags: ['spese_mediche'] },
            { v: 'renovation', label: 'I paid for building or renovation work', tags: ['bonus_casa'] },
            { v: 'rent', label: 'I rent my home', tags: ['rent_detrazione'] },
            { v: 'school', label: 'I pay school, university or sport fees for children', tags: ['spese_istruzione'] },
            { v: 'mortgage', label: 'I pay mortgage interest on my main home', tags: ['mutuo'] },
            { v: 'none', label: 'None of these', tags: [] }
          ] }
      ],
      follow: {
        cedolare_candidate: [{ id: 'it_cedolare', type: 'single', q: 'Do you use the cedolare secca on your rental?',
          help: 'A flat rate instead of adding rent to your ordinary income — usually better for higher earners.',
          opts: [
            { v: 'yes', label: 'Yes', tags: ['cedolare_active'] },
            { v: 'no', label: 'No, it goes on my normal income', tags: ['cedolare_unused'] },
            DK()
          ] }],
        self_employed: [{ id: 'it_regime', type: 'single', q: 'Have you compared forfettario against the ordinary regime?',
          help: 'Forfettario is simpler and often cheaper, but caps your revenue and blocks most deductions.',
          opts: [
            { v: 'compared', label: 'Yes, deliberately chosen', tags: ['regime_reviewed'] },
            { v: 'default', label: 'No, I just went with what I was told', tags: ['regime_unreviewed'] },
            DK()
          ] }],
        spese_mediche: [{ id: 'it_medical_claimed', type: 'single', q: 'Do you keep receipts and claim them?',
          help: 'Detrazione is normally 19% above a small excess, and requires traceable payment.',
          opts: [
            { v: 'yes', label: 'Yes, every year', tags: ['medical_claimed'] },
            { v: 'sometimes', label: 'Sometimes', tags: ['medical_partial'] },
            { v: 'no', label: 'No', tags: ['medical_unclaimed'] },
            DK()
          ] }]
      }
    }
  };

  return { questions: Q, otherOption: OTHER, dontKnow: DK };
})();
