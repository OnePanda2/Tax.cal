/* ============================================================================
   Tax.cal Plus — questionnaire UI.

   Answers are held in memory and in sessionStorage, and every question and
   finding is computed on the device. Nothing is transmitted unless the user
   explicitly presses Save on the results page, which is exactly what the
   privacy copy on the page promises — keep the two in step.
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.TAXCAL_DATA;
  var ENGINE = window.TaxEngine;
  var PLUS = window.TaxCalPlus;
  var QDEF = window.TAXCAL_PLUS_Q;

  var el = function (id) { return document.getElementById(id); };
  var show = function (n) { n.classList.remove('hidden'); };
  var hide = function (n) { n.classList.add('hidden'); };

  var CARRY_KEY = 'taxcal_carry';     // written by the calculator
  var PROGRESS_KEY = 'taxcal_plus_progress';

  var S = {
    ctx: null,        // { countryKey, region, gross, marginalRate, currency, ... }
    carry: null,      // what the calculator handed over, if anything
    queue: [],        // question objects, grows as follow-ups unlock
    idx: 0,
    answers: {},      // qid -> value | [values]
    other: {}         // qid -> free text
  };

  /* ---- formatting -------------------------------------------------------- */
  function money(n, cur) {
    try {
      return new Intl.NumberFormat(cur.locale, {
        style: 'currency', currency: cur.code,
        minimumFractionDigits: 0, maximumFractionDigits: 0
      }).format(Math.round(n));
    } catch (e) { return cur.symbol + Math.round(n).toLocaleString(); }
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- theme toggle (same behaviour as the calculator) -------------------- */
  function initTheme() {
    var btn = el('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var dark = cur ? cur === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      var next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('taxcal_theme', next); } catch (e) {}
    });
  }

  /* ---- carrying state over from the calculator ---------------------------
     Two routes in: sessionStorage written when the user clicks through, or
     URL params so a link can be shared or bookmarked. Neither is required —
     the page asks for the basics if it arrives cold.
     -------------------------------------------------------------------- */
  function readCarry() {
    var c = null;
    try {
      var raw = sessionStorage.getItem(CARRY_KEY);
      if (raw) c = JSON.parse(raw);
    } catch (e) { c = null; }

    var p = new URLSearchParams(location.search);
    if (p.get('c') && DATA.countries[p.get('c')]) {
      c = c || {};
      c.countryKey = p.get('c');
      if (p.get('g')) c.gross = Number(p.get('g')) || 0;
      if (p.get('s')) c.region = p.get('s');
      if (p.get('f')) c.filingStatus = p.get('f');
    }
    if (c && !DATA.countries[c.countryKey]) c = null;
    return c;
  }

  function buildCtx(countryKey, gross, region, filingStatus, spend) {
    var r = ENGINE.compute({
      countryKey: countryKey,
      gross: gross,
      filingStatus: filingStatus || 'single',
      region: region,
      spend: spend || {}
    });
    return {
      countryKey: countryKey,
      region: r.region,
      gross: r.gross,
      filingStatus: filingStatus || 'single',
      marginalRate: r.savings.marginalRate,
      currency: r.currency,
      country: r.country,
      headlineSavings: r.savings.high,
      stateHasNoIncomeTax: countryKey === 'US' && r.direct.state === 0
    };
  }

  /* ---- intro screen ------------------------------------------------------ */
  function renderCarrySummary() {
    var c = S.carry;
    var grid = el('carryGrid');
    if (!c) { hide(el('carryCard')); show(el('askBasics')); return; }

    var ctx = buildCtx(c.countryKey, c.gross, c.region, c.filingStatus, c.spend);
    S.ctx = ctx;
    var rows = [
      ['Country', ctx.country.flag + ' ' + ctx.country.name],
      ['Gross salary', money(ctx.gross, ctx.currency) + ' a year']
    ];
    if (ctx.region) {
      var tbl = DATA.regionTable[ctx.countryKey] || {};
      if (tbl[ctx.region]) rows.push([ctx.country.regionLabel || 'Region', tbl[ctx.region].name]);
    }
    rows.push(['Your marginal rate', Math.round(ctx.marginalRate * 100) + '%']);

    grid.innerHTML = rows.map(function (r) {
      return '<div class="carry-cell"><span class="ck">' + esc(r[0]) + '</span>'
        + '<span class="cv">' + esc(r[1]) + '</span></div>';
    }).join('');

    show(el('carryCard'));
    hide(el('askBasics'));
  }

  function initBasics() {
    var cs = el('pCountry');
    DATA.order.forEach(function (k) {
      var c = DATA.countries[k];
      var o = document.createElement('option');
      o.value = k; o.textContent = c.flag + '  ' + c.name;
      cs.appendChild(o);
    });

    function syncRegion() {
      var key = cs.value, c = DATA.countries[key];
      el('pCur').textContent = c.currency.symbol;
      var wrap = el('pRegionWrap'), sel = el('pRegion');
      if (!c.regionType) { hide(wrap); sel.innerHTML = ''; return; }
      show(wrap);
      el('pRegionLabel').textContent = c.regionLabel || 'Region';
      var tbl = DATA.regionTable[key] || {};
      sel.innerHTML = '';
      Object.keys(tbl).sort(function (a, b) { return tbl[a].name.localeCompare(tbl[b].name); })
        .forEach(function (rk) {
          var o = document.createElement('option');
          o.value = rk; o.textContent = tbl[rk].name; sel.appendChild(o);
        });
      sel.value = c.regionDefault || Object.keys(tbl)[0];
    }
    cs.addEventListener('change', syncRegion);
    syncRegion();
  }

  /* ---- question queue ----------------------------------------------------
     The queue starts as the five base questions and grows: after every answer
     we re-ask the engine which follow-ups are unlocked and append any new ones.
     Someone straightforward answers five and never sees the rest.
     -------------------------------------------------------------------- */
  function syncQueue() {
    var def = QDEF.questions[S.ctx.countryKey];
    if (!def) return;
    if (!S.queue.length) S.queue = def.base.slice();

    var unlocked = PLUS.unlockedFollowups(S.ctx.countryKey, S.answers);
    var have = {};
    S.queue.forEach(function (q) { have[q.id] = 1; });
    unlocked.forEach(function (q) { if (!have[q.id]) S.queue.push(q); });

    // Drop any queued follow-up that is no longer unlocked, unless already past.
    var stillUnlocked = {};
    unlocked.forEach(function (q) { stillUnlocked[q.id] = 1; });
    var baseIds = {};
    def.base.forEach(function (q) { baseIds[q.id] = 1; });
    S.queue = S.queue.filter(function (q, i) {
      if (baseIds[q.id]) return true;
      if (i < S.idx) return true;
      if (stillUnlocked[q.id]) return true;
      delete S.answers[q.id];
      delete S.other[q.id];
      return false;
    });
  }

  function saveProgress() {
    try {
      sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({
        countryKey: S.ctx.countryKey, gross: S.ctx.gross, region: S.ctx.region,
        filingStatus: S.ctx.filingStatus, answers: S.answers, other: S.other, idx: S.idx
      }));
    } catch (e) {}
  }

  /* ---- rendering one question -------------------------------------------- */
  function currentQ() { return S.queue[S.idx]; }

  function isAnswered(q) {
    var a = S.answers[q.id];
    if (a == null) return false;
    if (Array.isArray(a)) {
      if (!a.length) return false;
      if (a.indexOf('__other') > -1 && !(S.other[q.id] || '').trim()) return false;
      return true;
    }
    if (a === '__other') return !!(S.other[q.id] || '').trim();
    return true;
  }

  function renderQuestion() {
    syncQueue();
    var q = currentQ();
    if (!q) { renderResults(); return; }

    var total = S.queue.length;
    el('progCount').textContent = 'Question ' + (S.idx + 1) + ' of ' + total;
    el('progCountry').textContent = S.ctx.country.flag + ' ' + S.ctx.country.name;
    el('progFill').style.width = Math.round((S.idx / total) * 100) + '%';

    el('qTitle').textContent = q.q;
    var help = el('qHelp');
    if (q.help) { help.textContent = q.help; show(help); } else { hide(help); }

    var multi = q.type === 'multi';
    var opts = q.opts.concat([QDEF.otherOption]);
    var chosen = S.answers[q.id];
    var chosenArr = Array.isArray(chosen) ? chosen : (chosen == null ? [] : [chosen]);

    el('optList').innerHTML = opts.map(function (o) {
      var on = chosenArr.indexOf(o.v) > -1;
      return '<button class="opt' + (on ? ' on' : '') + '" type="button"'
        + ' data-v="' + esc(o.v) + '"'
        + ' role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="' + (on ? 'true' : 'false') + '">'
        + '<span class="opt-mark' + (multi ? ' box' : '') + '" aria-hidden="true"></span>'
        + '<span class="opt-body"><span class="opt-label">' + esc(o.label) + '</span>'
        + (o.hint ? '<span class="opt-hint">' + esc(o.hint) + '</span>' : '')
        + '</span></button>';
    }).join('');

    var otherOn = chosenArr.indexOf('__other') > -1;
    var ow = el('otherWrap');
    if (otherOn) { show(ow); el('otherText').value = S.other[q.id] || ''; } else { hide(ow); }

    el('qFoot').textContent = multi
      ? 'Choose as many as apply.'
      : 'Choose the one that fits best.';

    el('backBtn').disabled = S.idx === 0;
    el('nextBtn').textContent = (S.idx === S.queue.length - 1) ? 'See my list' : 'Continue';
    el('nextBtn').disabled = !isAnswered(q);
  }

  function pick(v) {
    var q = currentQ(), multi = q.type === 'multi';
    if (!multi) {
      S.answers[q.id] = v;
    } else {
      var arr = Array.isArray(S.answers[q.id]) ? S.answers[q.id].slice() : [];
      var i = arr.indexOf(v);
      if (i > -1) arr.splice(i, 1); else arr.push(v);
      // "None of these" is exclusive in both directions.
      if (v === 'none' && arr.indexOf('none') > -1) arr = ['none'];
      else if (v !== 'none') arr = arr.filter(function (x) { return x !== 'none'; });
      S.answers[q.id] = arr;
    }
    if (S.answers[q.id] !== '__other'
        && !(Array.isArray(S.answers[q.id]) && S.answers[q.id].indexOf('__other') > -1)) {
      delete S.other[q.id];
    }
    saveProgress();
    renderQuestion();
  }

  /* ---- results ----------------------------------------------------------- */
  function renderResults() {
    hide(el('stepQuestions'));
    show(el('stepResults'));
    window.scrollTo(0, 0);

    var res = PLUS.evaluate(S.ctx, S.answers);
    var cur = S.ctx.currency;

    // Hero
    if (res.quantifiedTotal > 0) {
      el('resBig').innerHTML = 'Worth checking: up to <span class="save-amt">'
        + money(res.quantifiedTotal, cur) + '</span> <span class="save-per">a year</span>';
      el('resSub').innerHTML = 'Across <b>' + res.quantifiedCount + '</b> item'
        + (res.quantifiedCount === 1 ? '' : 's') + ' we could put a number on, plus '
        + (res.findings.length - res.quantifiedCount) + ' more worth looking at.';
    } else {
      el('resBig').innerHTML = 'Nothing we can put a number on';
      el('resSub').innerHTML = 'That is a real result, not a failure — see below.';
    }
    el('resFine').textContent = 'Estimated at your marginal rate of '
      + Math.round(S.ctx.marginalRate * 100) + '%, assuming you can fund each contribution or claim in full. '
      + 'These are things to check, not amounts we have confirmed you are owed.';

    // Thin verdict — say so plainly rather than dress it up.
    if (res.shouldOfferRefund) {
      show(el('thinCard'));
      el('thinText').innerHTML = 'On what you have told us, you are already using the big levers available to you. '
        + 'We would rather say that than invent findings to justify the fee. '
        + 'There is still a short list below worth a look, but if this was not worth what you paid, '
        + '<b>ask us for a refund and you will get one</b>.';
    } else {
      hide(el('thinCard'));
    }

    // Findings
    el('findings').innerHTML = res.findings.map(function (f, i) {
      return '<article class="finding">'
        + '<div class="f-top">'
        + '<span class="f-rank">' + (i + 1) + '</span>'
        + '<h3 class="f-title">' + esc(f.title) + '</h3>'
        + '<span class="f-val' + (f.value == null ? ' none' : '') + '">'
        + (f.value == null ? 'no estimate' : money(f.value, cur)) + '</span>'
        + '</div>'
        + '<p class="f-why">' + esc(f.why) + '</p>'
        + '<p class="f-do"><b>What to do:</b> ' + esc(f.action) + '</p>'
        + '<div class="f-meta">'
        + '<span class="f-conf c-' + esc(f.confidence) + '">' + esc(f.confidence) + ' confidence</span>'
        + '<span class="f-basis">' + esc(f.basis) + '</span>'
        + '</div>'
        + '<p class="f-caveat">' + esc(f.caveat) + '</p>'
        + '</article>';
    }).join('');

    // Anything they typed themselves, or told us they did not know
    var notes = [];
    Object.keys(S.other).forEach(function (qid) {
      if ((S.other[qid] || '').trim()) notes.push(S.other[qid].trim());
    });
    if (res.needsReview || res.unknowns.length || notes.length) {
      show(el('reviewCard'));
      var txt = '';
      if (notes.length) {
        txt += 'You told us: <i>' + notes.map(esc).join('</i>; <i>') + '</i>. '
          + 'That does not fit any of our standard patterns, so it is flagged for a person to look at rather than guessed at by the rules.';
      }
      if (res.unknowns.length) {
        txt += (txt ? ' ' : '') + 'You also answered "not sure" to '
          + res.unknowns.length + ' question' + (res.unknowns.length === 1 ? '' : 's') + '. '
          + 'We have left those out of the estimate rather than assuming — finding the answer may add to your list.';
      }
      el('reviewText').innerHTML = txt;
    } else {
      hide(el('reviewCard'));
    }

    renderKeepCard();
  }

  /* ---- saving, restoring and deleting a review ---------------------------
     Saving is optional and explicit. Nothing leaves the browser until the
     user presses the button, which is what the privacy copy promises.
     -------------------------------------------------------------------- */
  var saved = null;   // { id, token, expiresAt } once saved

  function renderKeepCard() {
    var API = window.TaxCalAPI;
    var card = el('keepCard');
    if (!card) return;

    if (!API || !API.enabled()) {
      // Backend not deployed yet — say so plainly instead of showing a button
      // that silently does nothing.
      hide(el('keepBtn'));
      hide(el('keepOut'));
      el('keepIntro').textContent = 'This review lives only in this browser tab.';
      el('keepNote').textContent = 'Saving is not switched on yet. Use "Save as PDF" above to keep a copy.';
      return;
    }

    if (!saved) {
      show(el('keepBtn'));
      hide(el('keepOut'));
      el('keepNote').textContent = '';
      return;
    }

    hide(el('keepBtn'));
    show(el('keepOut'));
    var link = API.linkFor(saved.id, saved.token);
    el('keepLink').value = link;
    var until = saved.expiresAt ? new Date(saved.expiresAt * 1000) : null;
    el('keepMeta').innerHTML = 'Anyone with this link can open the review, so treat it like a password. '
      + 'We stored no email or name against it'
      + (until ? ', and it deletes itself on <b>' + until.toLocaleDateString() + '</b>' : '') + '.';
    el('keepNote').textContent = '';
  }

  function doSave() {
    var API = window.TaxCalAPI;
    var btn = el('keepBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    var res = PLUS.evaluate(S.ctx, S.answers);
    API.save(S.ctx, S.answers, S.other, res.findings).then(function (r) {
      btn.disabled = false;
      btn.textContent = 'Save my review';
      if (r.ok) {
        saved = { id: r.id, token: r.token, expiresAt: r.expiresAt };
        try { history.replaceState(null, '', API.linkFor(r.id, r.token)); } catch (e) {}
        renderKeepCard();
      } else {
        el('keepNote').textContent = r.offline
          ? 'Could not reach the server. Your review is still here — try again, or save a PDF.'
          : (String(r.error || 'Could not save that.').replace(/\.?$/, '.') + ' Your review is still here.');
      }
    });
  }

  function doDelete() {
    var API = window.TaxCalAPI;
    if (!saved) return;
    if (!confirm('Delete this saved review permanently? The link will stop working. This cannot be undone.')) return;
    var btn = el('deleteBtn');
    btn.disabled = true; btn.textContent = 'Deleting…';
    API.remove(saved.id, saved.token).then(function (r) {
      btn.disabled = false; btn.textContent = 'Delete it permanently';
      if (r.ok) {
        saved = null;
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
        renderKeepCard();
        el('keepNote').textContent = 'Deleted. Nothing of that review remains on our side.';
      } else {
        el('keepNote').textContent = 'Could not delete it just now. Please try again.';
      }
    });
  }

  /* Reopen a saved review from its link. Restores the answers too, so "Start
     over" and going Back both behave normally afterwards. */
  function restoreFromLink() {
    var API = window.TaxCalAPI;
    if (!API || !API.enabled()) return false;
    var link = API.readLink();
    if (!link) return false;

    el('keepIntro').textContent = 'Opening your saved review…';
    API.load(link.id, link.token).then(function (r) {
      if (!r.ok) {
        alert(r.offline
          ? 'Could not reach the server to open that review. Please try again.'
          : 'That link did not work. It may have been deleted or expired.');
        return;
      }
      var rev = r.review;
      S.ctx = buildCtx(rev.ctx.countryKey, rev.ctx.gross, rev.ctx.region, rev.ctx.filingStatus, {});
      S.answers = rev.answers || {};
      S.other = rev.other || {};
      S.queue = QDEF.questions[S.ctx.countryKey].base.slice();
      syncQueue();
      S.idx = S.queue.length;
      saved = { id: rev.id, token: link.token, expiresAt: rev.expiresAt };
      hide(el('stepIntro'));
      renderResults();
    });
    return true;
  }


  /* ---- wiring ------------------------------------------------------------ */
  function start(ctx) {
    S.ctx = ctx;
    S.queue = QDEF.questions[ctx.countryKey] ? QDEF.questions[ctx.countryKey].base.slice() : [];
    if (!S.queue.length) {
      alert('We do not have a question set for that country yet.');
      return;
    }
    S.idx = 0;
    hide(el('stepIntro'));
    show(el('stepQuestions'));
    window.scrollTo(0, 0);
    renderQuestion();
  }

  function init() {
    initTheme();
    initBasics();
    S.carry = readCarry();
    renderCarrySummary();
    restoreFromLink();

    el('startBtn').addEventListener('click', function () {
      var ctx = S.ctx;
      if (!ctx) {
        var key = el('pCountry').value;
        var gross = Number(el('pSalary').value) || 0;
        if (gross <= 0) { el('pSalary').focus(); return; }
        var c = DATA.countries[key];
        ctx = buildCtx(key, gross, c.regionType ? el('pRegion').value : null, 'single', {});
      }
      start(ctx);
    });

    el('optList').addEventListener('click', function (e) {
      var b = e.target.closest('.opt');
      if (b) pick(b.dataset.v);
    });

    el('otherText').addEventListener('input', function () {
      var q = currentQ();
      if (!q) return;
      S.other[q.id] = this.value;
      el('nextBtn').disabled = !isAnswered(q);
      saveProgress();
    });

    el('nextBtn').addEventListener('click', function () {
      var q = currentQ();
      if (!q || !isAnswered(q)) return;
      syncQueue();
      if (S.idx >= S.queue.length - 1) { renderResults(); return; }
      S.idx++;
      saveProgress();
      renderQuestion();
    });

    el('backBtn').addEventListener('click', function () {
      if (S.idx === 0) return;
      S.idx--;
      saveProgress();
      renderQuestion();
    });

    el('restartBtn').addEventListener('click', function () {
      S.answers = {}; S.other = {}; S.queue = []; S.idx = 0;
      saved = null;
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      try { sessionStorage.removeItem(PROGRESS_KEY); } catch (e) {}
      hide(el('stepResults'));
      show(el('stepIntro'));
      window.scrollTo(0, 0);
    });

    el('printBtn').addEventListener('click', function () { window.print(); });

    if (el('keepBtn')) el('keepBtn').addEventListener('click', doSave);
    if (el('deleteBtn')) el('deleteBtn').addEventListener('click', doDelete);
    if (el('copyBtn')) el('copyBtn').addEventListener('click', function () {
      var input = el('keepLink');
      input.select();
      var done = function () {
        var b = el('copyBtn'); b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy'; }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(done, done);
      else { try { document.execCommand('copy'); done(); } catch (e) {} }
    });

    // Keyboard: number keys pick options on single-choice questions.
    document.addEventListener('keydown', function (e) {
      if (el('stepQuestions').classList.contains('hidden')) return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      var q = currentQ();
      if (!q) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) {
        var btns = el('optList').querySelectorAll('.opt');
        if (btns[n - 1]) { btns[n - 1].click(); e.preventDefault(); }
      } else if (e.key === 'Enter' && !el('nextBtn').disabled) {
        el('nextBtn').click();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
