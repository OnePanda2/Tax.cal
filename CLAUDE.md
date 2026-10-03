# Working on Tax.cal

Read this first in every session.

## Every session

1. **Update the handover file at the end of every working session.** This is the owner's standing request. The handover is `F:\Projects\Handovers\PROJECT-HANDOVER TaxCal.md`, deliberately **outside** the repository because the repository is public and the handover holds strategy, legal and security notes. Never copy it into the repo or commit it (`.gitignore` blocks `*HANDOVER*.md`). Update its relevant sections and add a dated session section. Record every change, edit, upgrade or movement in the project there, not only code changes. Never write secrets or credentials into it.
2. **Commit to `main` as the owner**, so the work shows on the owner's GitHub contribution graph. Set the author with `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` to the identity on the owner's existing commits (`git log -1 --format='%an <%ae>' main`). Pushing `main` deploys the website (GitHub Pages) and triggers IndexNow, so push only after the checks below pass.
3. **Before every push to `main`:** run `npm test` (it must be fully green) and `npm run build:all`. Commit any regenerated files (`assets/tax-core.js`, `country/`, `hidden-tax/`, `tax-by-country/`, `dist/*.html`, `docs/TAX_RULE_SOURCES.md`).

## Ground rules

- **One engine.** Every tax number and rule lives in `packages/tax-core` (`rules/` for data, `calc/` for arithmetic). Never put rates or thresholds in front-end code, page builders or tool descriptions.
- **Never let a model do tax arithmetic.** The MCP tools return every figure. The skill tells the model to quote, not compute.
- **Sources and versions.** Every rule set has `ruleVersion`, `lastVerified`, `period` and `sources`. Follow `docs/UPDATING_TAX_RULES.md`. Expected test values are worked out by hand from the source, never copied from engine output. Do not invent tax rules, APIs or OpenAI requirements: check the primary source.
- **Privacy.** The website calculator sends nothing. The MCP server stores nothing and never logs arguments (`tests/mcp.test.mjs` enforces this). Never add salary, spending or any other tax detail to logs or analytics. Privacy-page claims must match the code (`tests/site.test.mjs` pins the wording).
- **Asset versions.** When any website asset changes, bump `taxcal-vNN` in `sw.js` and every `?v=NN` together.
- **No secrets in the repo or the plugin ZIP.** The OpenAI domain-verification token is a Wrangler secret (`OPENAI_APPS_CHALLENGE`).
- **Tool definitions are reviewed by OpenAI.** Changing tool names, descriptions, schemas or annotations in `mcp/src/tools.js` requires a new submission once the plugin is live.

## Commands

```bash
npm ci
npm test                 # everything (engine, India, golden, MCP, plugin, site)
npm run build:all        # bundle, pages, single-file builds, docs/TAX_RULE_SOURCES.md
npm start                # website on :8080
npm run mcp:dev          # MCP server on :8787/mcp
npm run mcp:smoke -- <url>
npm run plugin:zip       # dist/taxcal-plugin.zip (checked)
```

Map: `README.md` (overview), `IMPLEMENTATION_PLAN.md` (decisions and status), `docs/` (sources, India model, architecture, update procedure, submission checklist, release notes), `mcp/README.md`, `taxcal-plugin/README.md`.
