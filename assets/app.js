/* ============================================================================
   Tax.cal — app (UI wiring). No framework, no third-party scripts.
   ========================================================================== */
(function () {
  'use strict';
  var DATA = window.TAXCAL_DATA, ENGINE = window.TaxEngine;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { spendTouched: false, example: true, last: null };
  // ↓↓↓ Paste your Formspree form endpoint here to collect signups (see README). ↓↓↓
  var CONFIG = { formspree: 'https://formspree.io/f/mjyveryv' };
  var pendingRegion = null;

  /* ---- formatting -------------------------------------------------------- */
  function money(n, cur, dp) {
    try {
      return new Intl.NumberFormat(cur.locale, {
        style: 'currency', currency: cur.code,
        minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0
      }).format(Math.round(n));
    } catch (e) { return cur.symbol + Math.round(n).toLocaleString(); }
  }
  function pct(x, dp) { return (x * 100).toFixed(dp == null ? 1 : dp) + '%'; }

  /* ---- populate selects -------------------------------------------------- */
  function initSelects() {
    var cs = el('country');
    DATA.order.forEach(function (k) {
      var c = DATA.countries[k];
      var o = document.createElement('option');
      o.value = k; o.textContent = c.flag + '  ' + c.name;
      cs.appendChild(o);
    });
  }
  // populate the region dropdown (US states / Canadian provinces) for the country
  function populateRegion(key) {
    var c = DATA.countries[key], sel = el('region');
    var prev = sel.value;
    sel.innerHTML = '';
    if (!c.regionType) return;
    var tbl = DATA.regionTable[key] || {};
    Object.keys(tbl).sort(function (a, b) { return tbl[a].name.localeCompare(tbl[b].name); }).forEach(function (rk) {
      var o = document.createElement('option'); o.value = rk; o.textContent = tbl[rk].name; sel.appendChild(o);
    });
    sel.value = tbl[prev] ? prev : (c.regionDefault || (key === 'US' ? 'CA' : Object.keys(tbl)[0]));
  }

  /* ---- prefill spending from salary -------------------------------------- */
  function prefillSpend(force) {
    if (state.spendTouched && !force) return;
    var gross = Number(el('salary').value) || 0;
    var monthly = gross / 12;
    DATA.categories.forEach(function (cat) {
      var v = Math.round((monthly * cat.def) / 10) * 10;
      el('spend_' + cat.id).value = v > 0 ? v : '';
    });
  }

  /* ---- read inputs ------------------------------------------------------- */
  function readInput() {
    var key = el('country').value;
    var spend = {};
    DATA.categories.forEach(function (cat) { spend[cat.id] = Number(el('spend_' + cat.id).value) || 0; });
    return {
      countryKey: key,
      gross: Number(el('salary').value) || 0,
      filingStatus: el('filing').value,
      region: el('region').value,
      spend: spend
    };
  }

  /* ---- country-dependent UI ---------------------------------------------- */
  function syncCountryUI() {
    var key = el('country').value, c = DATA.countries[key];
    el('curSalary').textContent = c.currency.symbol;
    DATA.categories.forEach(function (cat) { el('cur_' + cat.id).textContent = c.currency.symbol; });
    var hasRegion = !!c.regionType;
    el('regionFields').classList.toggle('hidden', !hasRegion);
    el('filingField').classList.toggle('hidden', key !== 'US');
    if (hasRegion) { el('regionLabel').textContent = c.regionLabel || 'Region'; populateRegion(key); }
    var note = el('regionNote');
    if (c.note) { note.textContent = c.note; note.classList.remove('hidden'); }
    else note.classList.add('hidden');
    document.documentElement.setAttribute('data-country', key);
  }

  /* ---- ring -------------------------------------------------------------- */
  function drawRing(rate, animate) {
    var C = 2 * Math.PI * 52;              // r=52
    var taxLen = Math.max(0, Math.min(rate, 1)) * C;
    var arc = el('ringTax');
    arc.style.strokeDasharray = C.toFixed(2);
    if (animate && !reduce) {
      arc.style.transition = 'none';
      arc.style.strokeDashoffset = C.toFixed(2);
      arc.getBoundingClientRect();
      arc.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)';
      arc.style.strokeDashoffset = (C - taxLen).toFixed(2);
    } else {
      arc.style.transition = 'none';
      arc.style.strokeDashoffset = (C - taxLen).toFixed(2);
    }
  }

  /* ---- animated number --------------------------------------------------- */
  function countTo(node, to, fmt, animate) {
    if (!animate || reduce) { node.textContent = fmt(to); return; }
    var from = 0, start = null, dur = 850;
    function step(t) {
      if (start == null) start = t;
      var p = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---- render ------------------------------------------------------------ */
  var TONE = { brand: 'var(--brand)', brand2: 'var(--brand-2)', brandink: 'var(--brand-ink)', tax: 'var(--tax)', taxstrong: 'var(--tax-strong)' };

  function render(r, animate) {
    var cur = r.currency;
    // example flag
    el('exampleFlag').classList.toggle('hidden', !state.example);

    // ring + hero
    drawRing(r.effRate, animate);
    countTo(el('ringPct'), r.effRate, function (v) { return pct(v, 0); }, animate);
    countTo(el('heroBig'), r.taxTotal, function (v) { return money(v, cur); }, animate);
    el('heroSub').innerHTML = 'of your <b>' + money(r.gross, cur) + '</b> gross income ends up as tax';
    el('netLine').innerHTML = 'You keep about <b>' + money(r.netMonthly, cur) + '/month</b> after direct deductions'
      + (r.hidden > 0 ? ' — before <b>' + money(r.hidden, cur) + '/yr</b> of tax hidden in what you spend.' : '.');

    // savings — the value story. Leads with the high end, but framed as a typical-case
    // model (not a personal finding) so the claim stays defensible.
    // "the United Kingdom / United States / Netherlands", but bare "Germany", "France", …
    var sv = r.savings, cn = (['UK', 'US', 'NL'].indexOf(r.countryKey) > -1 ? 'the ' : '') + r.country.name;
    el('saveHigh').textContent = money(sv.high, cur);
    el('saveSub').innerHTML = "That's around <b>" + money(sv.monthly, cur) + ' a month</b>. It\'s what someone earning what you '
      + 'earn could keep by making full use of the legal tax-advantaged allowances in ' + cn + ' — most people never use all of them.';
    el('saveFine').textContent = 'Upper end of an estimate — not a personal finding. Modelled from your marginal rate ('
      + pct(sv.marginalRate, 0) + ') and the contribution limits available in ' + cn + '. We have not seen your actual '
      + 'circumstances, so some or none of this may apply to you. Information only, not tax advice.';
    el('notifyPitch').innerHTML = 'The figure above is what\'s <i>typically</i> possible at your income. Tax.cal Plus asks you a '
      + 'short set of questions about your real situation — what you already contribute, how you\'re paid, what you can claim — '
      + 'then tells you which of it you can actually use, and what each move is worth to you. In development — join the early-access list.';

    // split bar
    var seen = r.visible, unseen = r.hidden, tot = seen + unseen || 1;
    el('splitSeen').style.flex = seen / tot;
    el('splitUnseen').style.flex = unseen / tot;
    el('splitSeen').textContent = tot > 0 && seen / tot > .12 ? Math.round(seen / tot * 100) + '%' : '';
    el('splitUnseen').textContent = tot > 0 && unseen / tot > .12 ? Math.round(unseen / tot * 100) + '%' : '';
    el('legendSeen').innerHTML = 'Tax you see <b>' + money(seen, cur) + '/yr</b>';
    el('legendUnseen').innerHTML = 'Tax you don’t <b>' + money(unseen, cur) + '/yr</b>';

    // breakdown by type
    var maxType = Math.max.apply(null, r.types.map(function (t) { return t.amount; }).concat([1]));
    el('typeRows').innerHTML = r.types.map(function (t) {
      return '<div class="row"><div class="lhs"><span class="tick" style="background:' + TONE[t.tone] + '"></span>'
        + '<span><div class="name">' + t.name + '</div>'
        + '<div class="meta"><span class="conf ' + t.conf + '">' + (t.conf === 'high' ? 'known rate' : t.conf === 'med' ? 'estimate' : 'rough') + '</span></div></span></div>'
        + '<div class="amt tnum">' + money(t.amount, cur) + '<span class="of">' + pct(t.amount / r.gross) + ' of income</span></div></div>';
    }).join('');

    // categories (indirect)
    var cats = r.indirect.byCat.slice().filter(function (c) { return c.annual > 0; }).sort(function (a, b) { return b.annual - a.annual; });
    var maxCat = Math.max.apply(null, cats.map(function (c) { return c.annual; }).concat([1]));
    el('catRows').innerHTML = cats.length ? cats.map(function (c) {
      return '<div class="cat"><div class="cname">' + c.emoji + ' ' + c.label + '</div>'
        + '<div class="track"><div class="fill" style="width:' + (c.annual / maxCat * 100).toFixed(0) + '%"></div></div>'
        + '<div class="cval tnum">' + money(c.annual, cur) + '</div></div>';
    }).join('') : '<p class="hint" style="padding:6px 0">Add your monthly spending above to reveal the tax hidden in it.</p>';
    el('catTotal').textContent = money(r.indirect.total, cur) + '/yr';

    // comparison
    var maxR = Math.max.apply(null, r.comparison.map(function (c) { return c.rate; }).concat([.01]));
    el('cmpBars').innerHTML = r.comparison.slice().sort(function (a, b) { return b.rate - a.rate; }).map(function (c) {
      return '<div class="bar ' + (c.isMe ? 'me' : '') + '"><div class="cty"><span class="fl">' + c.flag + '</span>' + c.name + '</div>'
        + '<div class="track"><div class="fill" style="width:' + Math.max(3, c.rate / maxR * 100).toFixed(0) + '%"></div></div>'
        + '<div class="val tnum">' + pct(c.rate, 0) + '</div></div>';
    }).join('');

    // tax freedom day
    var d = r.taxFreedomDay;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    el('tfdMonth').textContent = months[d.getMonth()];
    el('tfdDay').textContent = d.getDate();
    el('tfdText').innerHTML = 'At this rate you work from <b>1 January until ' + d.getDate() + ' ' + months[d.getMonth()]
      + '</b> just to cover tax. Everything after is yours.';

    // tips
    el('tips').innerHTML = r.country.tips.map(function (t) {
      return '<div class="tip"><span class="ti">' + ICON.bulb + '</span><div><h4>' + t[0] + '</h4><p>' + t[1] + '</p></div></div>';
    }).join('');
    el('tipsCountry').textContent = r.country.name;

    // share card
    drawShareCard(r);
    state.last = r;
    updateDeepLink(r);
  }

  /* ---- deep link (for country landing pages / sharing) ------------------- */
  function updateDeepLink(r) {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams();
    p.set('c', r.countryKey);
    if (r.region) p.set('s', r.region);
    try { history.replaceState(null, '', '#' + p.toString()); } catch (e) {}
  }
  function readDeepLink() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return;
    var p = new URLSearchParams(h);
    var c = p.get('c'); if (c && DATA.countries[c]) el('country').value = c;
    pendingRegion = p.get('s'); // applied after the region dropdown is populated
  }

  /* ---- share card (canvas) ---------------------------------------------- */
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawShareCard(r) {
    var cv = el('shareCanvas'); if (!cv) return;
    var W = 1080, H = 1350; cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    var g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0C1A22'); g.addColorStop(1, '#0B2A2C');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // subtle brand glow
    var rg = x.createRadialGradient(W * .8, H * .15, 40, W * .8, H * .15, 700);
    rg.addColorStop(0, 'rgba(16,185,129,.22)'); rg.addColorStop(1, 'rgba(16,185,129,0)');
    x.fillStyle = rg; x.fillRect(0, 0, W, H);

    x.textBaseline = 'alphabetic';
    // wordmark
    x.fillStyle = '#EAF2F1'; x.font = '800 46px "Bricolage Grotesque", sans-serif';
    x.fillText('Tax.cal', 96, 130);
    x.fillStyle = '#7FB8AE'; x.font = '500 30px "IBM Plex Sans", sans-serif';
    x.fillText(r.country.flag + '  ' + r.country.name + (r.countryKey === 'US' ? ' · ' + r.usState : ''), 96, 178);

    // ring
    var cx = W / 2, cy = 560, rad = 210, lw = 46;
    x.lineCap = 'round';
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = lw;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
    var start = -Math.PI / 2, end = start + Math.max(0, Math.min(r.effRate, 1)) * Math.PI * 2;
    var ag = x.createLinearGradient(cx - rad, cy, cx + rad, cy);
    ag.addColorStop(0, '#F59E0B'); ag.addColorStop(1, '#F97316');
    x.strokeStyle = ag; x.lineWidth = lw;
    x.beginPath(); x.arc(cx, cy, rad, start, end); x.stroke();
    // center
    x.textAlign = 'center';
    x.fillStyle = '#F7B54A'; x.font = '800 150px "Bricolage Grotesque", sans-serif';
    x.fillText(pct(r.effRate, 0), cx, cy + 40);
    x.fillStyle = '#9FC3BC'; x.font = '600 30px "IBM Plex Sans", sans-serif';
    x.fillText('OF MY INCOME GOES TO TAX', cx, cy + 108);

    // headline
    x.fillStyle = '#EAF2F1'; x.font = '800 52px "Bricolage Grotesque", sans-serif';
    x.fillText('That’s ' + money(r.taxTotal, r.currency) + ' a year', cx, 900);

    // split chips
    var chipY = 980, cw = 400, ch = 120, gap = 40;
    function chip(px, label, val, col) {
      rr(x, px, chipY, cw, ch, 22); x.fillStyle = 'rgba(255,255,255,.05)'; x.fill();
      x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2; x.stroke();
      x.textAlign = 'left';
      x.fillStyle = '#8FB2AC'; x.font = '600 26px "IBM Plex Sans", sans-serif'; x.fillText(label, px + 30, chipY + 48);
      x.fillStyle = col; x.font = '800 44px "Bricolage Grotesque", sans-serif'; x.fillText(val, px + 30, chipY + 96);
    }
    chip(cx - cw - gap / 2, 'Tax you see', money(r.visible, r.currency), '#5BE0B0');
    chip(cx + gap / 2, 'Tax you don’t', money(r.hidden, r.currency), '#F7B54A');

    // freedom day
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    x.textAlign = 'center'; x.fillStyle = '#B9D6D0'; x.font = '500 30px "IBM Plex Sans", sans-serif';
    x.fillText('I work until ' + r.taxFreedomDay.getDate() + ' ' + months[r.taxFreedomDay.getMonth()] + ' just to pay it.', cx, 1210);
    x.fillStyle = '#5E8580'; x.font = '500 24px "IBM Plex Sans", sans-serif';
    x.fillText('Estimate · check yours at taxcal.siddheshthapa.com', cx, 1275);
    x.textAlign = 'left';
  }

  /* ---- share / download -------------------------------------------------
     Works in three environments, best-first:
       1) Web Share with a file  — mobile browsers on the real site
       2) claude.ai "downloads" capability — when running as an Artifact
       3) plain <a download>     — desktop on the self-hosted site         */
  function canvasBlob() { return new Promise(function (res) { el('shareCanvas').toBlob(res, 'image/png'); }); }
  function anchorDownload(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'my-tax-wrapped.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  async function artifactSave(blob) {
    // Only present when the page runs inside claude.ai as an Artifact.
    if (!(window.claude && typeof window.claude.use === 'function')) return false;
    try {
      var downloads = await window.claude.use('downloads');
      if (!downloads) return false;
      await downloads.save({ filename: 'my-tax-wrapped.png', data: blob });
      return true;
    } catch (e) { return true; } // declined/rate-limited etc. — don't fall through to a dead link
  }
  async function offerCard(preferShare) {
    var blob = await canvasBlob();
    if (preferShare) {
      try {
        var file = new File([blob], 'my-tax-wrapped.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Tax.cal', text: 'My real tax rate is ' + pct(state.last.effRate, 0) + '. See yours at taxcal.siddheshthapa.com' });
          return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    if (await artifactSave(blob)) return;
    anchorDownload(blob);
  }

  /* ---- compute + paint --------------------------------------------------- */
  function recompute(animate) {
    var input = readInput();
    var r = ENGINE.compute(input);
    render(r, animate);
    // Hand the current state to the Plus flow so it never re-asks what we know.
    // sessionStorage, not localStorage: it dies with the tab, which keeps the
    // free calculator's "nothing stored" promise honest.
    try { sessionStorage.setItem('taxcal_carry', JSON.stringify(input)); } catch (e) {}
  }
  var debTimer;
  function debouncedRecompute() { clearTimeout(debTimer); debTimer = setTimeout(function () { recompute(false); }, 120); }

  /* ---- events ------------------------------------------------------------ */
  function bind() {
    el('country').addEventListener('change', function () {
      syncCountryUI(); prefillSpend(false); recompute(false);
    });
    el('filing').addEventListener('change', function () { recompute(false); });
    el('region').addEventListener('change', function () { recompute(false); });
    el('salary').addEventListener('input', function () {
      state.example = false; prefillSpend(false); debouncedRecompute();
    });
    DATA.categories.forEach(function (cat) {
      el('spend_' + cat.id).addEventListener('input', function () {
        state.spendTouched = true; state.example = false; debouncedRecompute();
      });
    });
    el('revealBtn').addEventListener('click', function () {
      state.example = false;
      recompute(true);
      el('results').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    el('dlBtn').addEventListener('click', function () { offerCard(false); });
    el('shareBtn').addEventListener('click', function () { offerCard(true); });
    el('notifyForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = el('email').value;
      try { localStorage.setItem('taxcal_notify', email); } catch (x) {}
      var finish = function () { el('notifyForm').classList.add('hidden'); el('notifyOk').classList.remove('hidden'); };
      var url = CONFIG.formspree;
      if (url && url.indexOf('REPLACE_ME') === -1) { // real endpoint configured → collect the signup
        var fd = new FormData();
        fd.append('email', email);
        fd.append('country', el('country').value);
        fd.append('_subject', 'New Tax.cal early-access signup');
        fetch(url, { method: 'POST', headers: { Accept: 'application/json' }, body: fd }).then(finish, finish);
      } else { finish(); } // no endpoint yet: stored locally, thank the user
    });
    el('themeBtn').addEventListener('click', toggleTheme);
  }

  /* ---- theme ------------------------------------------------------------- */
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    var isDark = cur === 'dark' || (!cur && matchMedia('(prefers-color-scheme: dark)').matches);
    var next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('taxcal_theme', next); } catch (e) {}
    syncThemeIcon();
    if (state.last) drawShareCard(state.last);
  }
  function syncThemeIcon() {
    var cur = document.documentElement.getAttribute('data-theme');
    var isDark = cur === 'dark' || (!cur && matchMedia('(prefers-color-scheme: dark)').matches);
    el('themeBtn').innerHTML = isDark ? ICON.sun : ICON.moon;
  }
  function initTheme() {
    try { var t = localStorage.getItem('taxcal_theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
    syncThemeIcon();
  }

  /* ---- icons ------------------------------------------------------------- */
  var ICON = {
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
  };

  /* ---- boot -------------------------------------------------------------- */
  function boot() {
    initSelects();
    initTheme();
    // example starting state (UK, £45,000) unless deep-linked
    el('country').value = 'UK';
    el('salary').value = 45000;
    readDeepLink();
    syncCountryUI();
    if (pendingRegion) { var tbl = DATA.regionTable[el('country').value]; if (tbl && tbl[pendingRegion]) el('region').value = pendingRegion; }
    prefillSpend(true);
    bind();
    recompute(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
