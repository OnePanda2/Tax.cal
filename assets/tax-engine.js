/* ============================================================================
   Tax.cal — engine  (tax year 2026)
   Pure functions. Reads rates from window.TAXCAL_DATA. Returns ESTIMATES.
   Income-tax bracket tables live here (structural); consumption / state data
   lives in tax-data.js. All validated against published take-home figures.
   ========================================================================== */
window.TaxEngine = (function (DATA) {
  const INF = Infinity;

  /* --- income-tax bracket tables (2026), absolute upper thresholds --------- */
  const US_FED = {
    single: { std: 16100, b: [[.10,12400],[.12,50400],[.22,105700],[.24,201775],[.32,256225],[.35,640600],[.37,INF]] },
    mfj:    { std: 32200, b: [[.10,24800],[.12,100800],[.22,211400],[.24,403550],[.32,512450],[.35,768700],[.37,INF]] }
  };
  const DE_IT = [[.14,17000],[.20,25000],[.24,40000],[.33,55000],[.39,69878],[.42,277825],[.45,INF]]; // floor 12348
  const FR_IT = [[.11,29579],[.30,84577],[.41,181917],[.45,INF]];                                     // floor 11600
  const NL_B  = [[.3575,38883],[.3756,78426],[.4950,INF]];                                             // from 0
  const IE_USC = [[.005,12012],[.02,28700],[.03,70044],[.08,INF]];
  const CA_FED = [[.14,58523],[.205,117045],[.26,181440],[.29,258482],[.33,INF]];                      // + BPA credit
  const CA_BPA = 16452;
  const AU_IT = [[0,18200],[.15,45000],[.30,135000],[.37,190000],[.45,INF]];                            // 2026-27
  const ES_IT = [[.19,12450],[.24,20200],[.30,35200],[.37,60000],[.45,300000],[.47,INF]];              // combined state+regional
  const IT_IT = [[.23,28000],[.33,50000],[.43,INF]];

  /* --- helpers ------------------------------------------------------------ */
  // marginal tax over absolute thresholds, starting from `floor`
  function brackets(x, b, floor) {
    let tax = 0, prev = floor || 0;
    for (let i = 0; i < b.length; i++) {
      const rate = b[i][0], upTo = b[i][1];
      if (x > prev) { tax += (Math.min(x, upTo) - prev) * rate; prev = upTo; }
      else break;
    }
    return tax;
  }

  /* --- per-country direct tax (income + social + state) ------------------- */
  function ukIncomeTax(y) {
    let pa = 12570;
    if (y > 100000) pa = Math.max(0, 12570 - (y - 100000) / 2);
    const b20 = 50270, b40 = 125140;
    const t20 = Math.max(0, Math.min(y, b20) - pa) * .20;
    const t40 = Math.max(0, Math.min(y, b40) - b20) * .40;
    const t45 = Math.max(0, y - b40) * .45;
    return t20 + t40 + t45;
  }
  function ukNI(y) {
    const pt = 12570, uel = 50270;
    return Math.max(0, Math.min(y, uel) - pt) * .08 + Math.max(0, y - uel) * .02;
  }

  function usFica(y, status) {
    const ss = Math.min(y, 184500) * .062;
    const medicare = y * .0145;
    const addlThresh = status === 'mfj' ? 250000 : 200000;
    const addl = Math.max(0, y - addlThresh) * .009;
    return ss + medicare + addl;
  }
  function usStateTax(y, stateKey, fedStd) {
    const st = DATA.usStates[stateKey];
    if (!st) return 0;
    const inc = st.income;
    if (inc.t === 'none') return 0;
    const base = Math.max(0, y - fedStd); // proxy for state taxable income
    if (inc.t === 'flat') return base * inc.r;
    return brackets(base, inc.b, 0);
  }

  function deIncomeTax(y) { return y <= 12348 ? 0 : brackets(y, DE_IT, 12348); }
  function deSocial(y) {
    return Math.min(y, 66150) * .21 + Math.max(0, Math.min(y, 96600) - 66150) * .106;
  }

  function frIncomeTax(y) { return brackets(y * 0.90, FR_IT, 11600); }
  function frSocial(y) { return y * 0.22; }

  function nlTax(y) {
    const gross = brackets(y, NL_B, 0);
    let alg = y <= 29736 ? 3115 : (y <= 78426 ? Math.max(0, 3115 - 0.064 * (y - 29736)) : 0);
    let arb = y <= 45592 ? 5685 * (y / 45592) : Math.max(0, 5685 - 0.0651 * (y - 45592));
    return Math.max(0, gross - alg - arb);
  }

  function ieIncomeTax(y) {
    const band = 44000;
    const t = Math.min(y, band) * .20 + Math.max(0, y - band) * .40;
    return Math.max(0, t - 4000); // personal + PAYE credits
  }
  function ieSocial(y) {
    const usc = y <= 13000 ? 0 : brackets(y, IE_USC, 0);
    const prsi = y * .0435;
    return usc + prsi;
  }

  // Canada: federal + provincial income tax (each with a basic-personal-amount credit), CPP + EI
  function caFedTax(y) { return Math.max(0, brackets(y, CA_FED, 0) - CA_BPA * 0.14); }
  function caProvTax(y, prov) {
    const p = DATA.caProvinces[prov]; if (!p) return 0;
    return Math.max(0, brackets(y, p.income.b, 0) - p.bpa * p.income.b[0][0]);
  }
  function caSocial(y) {
    const cpp = Math.min(Math.max(0, Math.min(y, 74600) - 3500) * .0595, 4230.45);
    const cpp2 = Math.min(Math.max(0, Math.min(y, 85000) - 74600) * .04, 416);
    const ei = Math.min(Math.min(y, 68900) * .0163, 1123.07);
    return cpp + cpp2 + ei;
  }

  function auIncomeTax(y) { return brackets(y, AU_IT, 0); }
  function auSocial(y) { return y * .02; } // Medicare levy

  function esIncomeTax(y) { return Math.max(0, brackets(Math.max(0, y - 2000), ES_IT, 0) - 5550 * .19); }
  function esSocial(y) { return Math.min(y, 59000) * .0645; }

  function itIncomeTax(y) { return Math.max(0, brackets(y, IT_IT, 0) - 1900) + y * .019; } // + addizionali
  function itSocial(y) { return Math.min(y, 122295) * .0919; }

  /* Direct tax for any country. opts = {status, region}. */
  function directTaxFor(key, y, opts) {
    opts = opts || {};
    let income = 0, social = 0, state = 0;
    switch (key) {
      case 'UK': income = ukIncomeTax(y); social = ukNI(y); break;
      case 'US': {
        const fed = US_FED[opts.status === 'mfj' ? 'mfj' : 'single'];
        income = brackets(Math.max(0, y - fed.std), fed.b, 0);
        social = usFica(y, opts.status);
        state = opts.region ? usStateTax(y, opts.region, fed.std) : 0;
        break;
      }
      case 'CA': income = caFedTax(y) + caProvTax(y, opts.region || 'ON'); social = caSocial(y); break;
      case 'AU': income = auIncomeTax(y); social = auSocial(y); break;
      case 'DE': income = deIncomeTax(y); social = deSocial(y); break;
      case 'FR': income = frIncomeTax(y); social = frSocial(y); break;
      case 'NL': income = nlTax(y); social = 0; break;
      case 'IE': income = ieIncomeTax(y); social = ieSocial(y); break;
      case 'ES': income = esIncomeTax(y); social = esSocial(y); break;
      case 'IT': income = itIncomeTax(y); social = itSocial(y); break;
    }
    return { income, social, state, total: income + social + state };
  }

  /* --- indirect tax: effective fraction of spend, per category ------------ */
  function catFraction(key, catId, region) {
    const c = DATA.countries[key];
    if (c.model === 'us' || c.model === 'ca') { // sales tax varies by state/province
      if (catId === 'fuel') return c.fuelFraction;
      const share = c.catShare[catId] || 0;
      const tbl = DATA.regionTable[key] || {};
      const r = (tbl[region] ? tbl[region].sales : 0) / 100;
      return (r / (1 + r)) * share; // spend is tax-inclusive
    }
    return c.cat[catId] || 0;
  }

  /* --- FX convert (approx, for comparison only) --------------------------- */
  function convert(amount, fromCur, toCur) {
    const usd = amount * (DATA.fxUSD[fromCur] || 1);
    return usd / (DATA.fxUSD[toCur] || 1);
  }

  // representative region used for "other country" comparison bars
  function repRegion(k) { return k === 'CA' ? 'ON' : null; }

  /* --- estimated potential saving (the value story) -----------------------
     Grounded in a real lever: routing pre-tax money through the country's main
     tax-advantaged account (pension/RRSP/super/…) at the user's marginal rate,
     capped by that country's actual limit — plus a modest floor for the
     allowances/credits people typically leave unclaimed. Presented as "up to".*/
  function estimateSavings(key, y, opts) {
    if (y <= 0) return { low: 0, high: 0, monthly: 0, marginalRate: 0 };
    const step = 1000;
    const d0 = directTaxFor(key, y, opts).total;
    const d1 = directTaxFor(key, y + step, opts).total;
    const mr = Math.min(0.62, Math.max(0, (d1 - d0) / step));
    const cap = DATA.savingsCap[key] || 20000;
    const round10 = (x) => Math.round(x / 10) * 10;
    let high = round10(Math.max(Math.min(y * 0.15, cap) * mr, y * 0.02));
    let low = round10(Math.min(Math.min(y * 0.06, cap) * mr, y * 0.008));
    if (low >= high) low = round10(high * 0.5);
    return { low: low, high: high, monthly: high / 12, marginalRate: mr };
  }

  /* --- main compute ------------------------------------------------------- */
  function compute(input) {
    const key = input.countryKey;
    const c = DATA.countries[key];
    const y = Math.max(0, Number(input.gross) || 0);
    const status = input.filingStatus || 'single';
    // Validate the region against the lookup table rather than trusting the input.
    // An unknown key (stale select, hand-edited deep link) used to fall through as
    // "no region", which silently zeroed both state income tax and sales tax.
    const regionTbl = DATA.regionTable[key] || {};
    const region = c.regionType
      ? (regionTbl[input.region] ? input.region : (c.regionDefault || Object.keys(regionTbl)[0] || null))
      : null;
    const opts = { status: status, region: region };

    const direct = directTaxFor(key, y, opts);

    // indirect, per category
    let indirectTotal = 0, consumptionTax = 0, fuelTax = 0;
    const byCat = DATA.categories.map(function (cat) {
      const monthly = Math.max(0, Number(input.spend && input.spend[cat.id]) || 0);
      const frac = catFraction(key, cat.id, region);
      const annual = monthly * frac * 12;
      indirectTotal += annual;
      if (cat.id === 'fuel') fuelTax += annual; else consumptionTax += annual;
      return {
        id: cat.id, label: cat.label, emoji: cat.emoji,
        monthly: monthly, fraction: frac, annual: annual,
        conf: c.catConf[cat.id] || 'med'
      };
    });

    const taxTotal = direct.total + indirectTotal;
    const effRate = y > 0 ? taxTotal / y : 0;
    const directRate = y > 0 ? direct.total / y : 0;
    const netAnnual = y - direct.total;

    // breakdown by type
    const types = [];
    types.push({ key: 'income', name: c.incomeName, amount: direct.income, tone: 'brand', conf: 'high' });
    if (c.socialName) types.push({ key: 'social', name: c.socialName, amount: direct.social, tone: 'brand2', conf: 'high' });
    if (key === 'US') types.push({ key: 'state', name: 'State income tax (' + region + ')', amount: direct.state, tone: 'brandink', conf: 'high' });
    types.push({ key: 'vat', name: c.consumptionName + ' on spending', amount: consumptionTax, tone: 'tax', conf: 'med' });
    types.push({ key: 'fuel', name: 'Fuel taxes', amount: fuelTax, tone: 'taxstrong', conf: 'med' });
    const typesFiltered = types.filter(function (t) { return t.amount > 0.5; });

    // cross-country comparison (direct-tax rate, FX-converted salary)
    const comparison = DATA.order.map(function (k) {
      const oc = DATA.countries[k];
      if (k === key) {
        return { key: k, name: c.name + (region ? ' · ' + region : ''), flag: c.flag, rate: directRate, isMe: true };
      }
      const g = convert(y, c.currency.code, oc.currency.code);
      const rr = repRegion(k);
      const d = directTaxFor(k, g, { status: 'single', region: rr });
      return {
        key: k,
        name: oc.name + (k === 'US' ? ' · fed.' : rr ? ' · ' + rr : ''),
        flag: oc.flag,
        rate: g > 0 ? d.total / g : 0,
        isMe: false
      };
    });

    // tax freedom day (from total effective rate)
    const days = Math.round(Math.min(effRate, 0.999) * 365);
    const tfd = new Date(2026, 0, 1);
    tfd.setDate(tfd.getDate() + days);

    return {
      countryKey: key, country: c, currency: c.currency,
      gross: y, status: status, region: region,
      direct: direct, indirect: { total: indirectTotal, consumption: consumptionTax, fuel: fuelTax, byCat: byCat },
      taxTotal: taxTotal, effRate: effRate, directRate: directRate,
      netAnnual: netAnnual, netMonthly: netAnnual / 12,
      visible: direct.total, hidden: indirectTotal,
      savings: estimateSavings(key, y, opts),
      types: typesFiltered, comparison: comparison, taxFreedomDay: tfd
    };
  }

  return { compute: compute, directTaxFor: directTaxFor, convert: convert, estimateSavings: estimateSavings };
})(window.TAXCAL_DATA);
