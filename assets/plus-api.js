/* ============================================================================
   Tax.cal Plus — API client.

   Every function degrades to "not available" rather than throwing, so the
   questionnaire keeps working in full when the backend is not deployed, is
   down, or is blocked. Saving is an enhancement, never a dependency.

   To turn saving on, set BASE to the deployed Worker URL (see api/README.md).
   ========================================================================== */
window.TaxCalAPI = (function () {
  'use strict';

  // ↓↓↓ Paste the deployed Worker URL here to enable saving. ↓↓↓
  var BASE = '';

  // Local development convenience: use the local worker when serving locally.
  if (!BASE && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
    BASE = 'http://127.0.0.1:8787';
  }

  var TIMEOUT_MS = 8000;

  function enabled() { return !!BASE; }

  function request(path, opts) {
    if (!enabled()) return Promise.resolve({ ok: false, offline: true });

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;

    return fetch(BASE + path, Object.assign({ signal: ctrl && ctrl.signal }, opts || {}))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
      })
      .catch(function () { return { ok: false, offline: true }; })
      .then(function (r) { if (timer) clearTimeout(timer); return r; });
  }

  /* Save a completed review. Resolves to { ok, id, token } or { ok:false, ... }. */
  function save(ctx, answers, other, findings) {
    return request('/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Send only what the API stores. No email, no name — there is nothing
        // to send, because the flow never asks for one.
        ctx: {
          countryKey: ctx.countryKey, region: ctx.region || null,
          filingStatus: ctx.filingStatus || null,
          gross: ctx.gross, marginalRate: ctx.marginalRate
        },
        answers: answers,
        other: other || {},
        findings: (findings || []).map(function (f) {
          return { id: f.id, title: f.title, value: f.value, confidence: f.confidence };
        })
      })
    }).then(function (r) {
      if (r.ok && r.body && r.body.id) {
        return { ok: true, id: r.body.id, token: r.body.token, expiresAt: r.body.expiresAt };
      }
      return { ok: false, offline: r.offline, error: (r.body && r.body.error) || null };
    });
  }

  function load(id, token) {
    return request('/review/' + encodeURIComponent(id) + '?t=' + encodeURIComponent(token))
      .then(function (r) {
        if (r.ok && r.body && r.body.id) return { ok: true, review: r.body };
        return { ok: false, offline: r.offline, error: (r.body && r.body.error) || null };
      });
  }

  function remove(id, token) {
    return request('/review/' + encodeURIComponent(id) + '?t=' + encodeURIComponent(token),
      { method: 'DELETE' })
      .then(function (r) {
        return { ok: !!(r.ok && r.body && r.body.deleted), offline: r.offline };
      });
  }

  /* Build the link that reopens a saved review. The token lives in the URL
     fragment so it is never sent to the server in a request line, never lands
     in access logs, and is not passed on in a Referer header. */
  function linkFor(id, token) {
    return location.origin + location.pathname + '#r=' + id + '&t=' + token;
  }

  function readLink() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return null;
    var p = new URLSearchParams(h);
    var id = p.get('r'), t = p.get('t');
    return (id && t) ? { id: id, token: t } : null;
  }

  return {
    enabled: enabled, save: save, load: load, remove: remove,
    linkFor: linkFor, readLink: readLink,
    get base() { return BASE; }
  };
})();
