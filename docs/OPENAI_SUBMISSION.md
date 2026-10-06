# Submitting Tax.cal to OpenAI

A step-by-step checklist for listing the Tax.cal plugin in ChatGPT. It is based on OpenAI's plugin documentation as checked on 6 October 2026: [Package your plugin](https://developers.openai.com/plugins/build/plugins), [Upload and submit your plugin](https://developers.openai.com/plugins/deploy/submission), [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines), [Remote MCP server review requirements](https://developers.openai.com/plugins/deploy/app-review), [Plugin submission errors](https://developers.openai.com/plugins/deploy/submission-errors), [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt) and the Help Center article [API Organization Verification](https://help.openai.com/en/articles/10910291-api-organization-verification). Those pages are the source of truth. If anything below disagrees with them, follow OpenAI's page and update this file.

Everything that can be prepared in the repository is prepared. The steps marked **(owner)** need the owner's own accounts and cannot be done from code.

## 0. What is already prepared

| Item | Where |
|---|---|
| Plugin package (manifest, MCP config, skill, logo, README) | `taxcal-plugin/` → `npm run plugin:zip` → `dist/taxcal-plugin.zip` |
| Name, subtitle, description, category, capabilities, URLs, starter prompts, colours | `taxcal-plugin/plugin.json` → `extensions["com.openai"].interface` |
| Five positive and three negative test cases | `plugin.json` → `review.test_cases` (also `mcp/chatgpt-app-submission.json`) |
| Tool annotations | Explicit `readOnlyHint`, `destructiveHint` and `openWorldHint` on every tool in `mcp/src/tools.js`. OpenAI scans them from the live server, and justifications are no longer required. `mcp/chatgpt-app-submission.json` was written for the previous submission form and is kept in step with `plugin.json` for reference |
| Release notes | `plugin.json` → `publication.release_notes` |
| Website, support, privacy and terms pages | https://taxcal.siddheshthapa.com/, `/support/`, `/privacy/`, `/terms/` |
| MCP server code and config | `mcp/` (Cloudflare Worker), `mcp/wrangler.toml` |
| Domain-verification endpoint | `GET /.well-known/openai-apps-challenge`, which serves the `OPENAI_APPS_CHALLENGE` secret |
| Health check | `GET /health`, plus `.github/workflows/mcp-health.yml` |

**No reviewer account is needed.** The server has no authentication, no sign-in and no user data, so there are no credentials to give reviewers. Do not create a demo account or put any credentials in the package or the form.

## 1. Prerequisites (owner)

- [ ] **Individual verification**, done in the OpenAI Platform organization settings (platform.openai.com → Settings → Organization → General). Every submission must come from a verified individual or organization. Tax.cal is published under the owner's own name (`developerName` "Siddhesh Thapa"), so **individual** verification is the right kind: it needs an original, physical government photo ID and possibly a selfie. **Business** verification is for publishing under a company name and needs company records. At upload you choose this verified **Developer identity**, and the directory shows its name.
  - **A default payment method comes first.** Pressing **Start** asks for a valid card set as the organization's default payment method (seen in the dashboard on 7 October 2026). The card form shows Visa, Mastercard, American Express and Diners Club. RuPay is not among them, and forum reports say RuPay debit cards are declined. OpenAI's help centre says prepaid cards cannot buy API credits, so avoid prepaid and forex cards. The bank must allow online and international transactions, and its OTP (3D Secure) must be completed. Adding a card buys nothing; the dialog asks for a card on file, not for credits.
  - One person can verify only one account or organization, so do it once, on the account that will own the plugin.
  - Scans, photocopies, screenshots and digital IDs are rejected.
  - If **Submit for review** later says individual verification is not complete although it shows as approved, check that the submission identity matches the verification type. That was OpenAI support's answer to the same error in the developer forum (April 2026).
- [ ] You are an **organization owner**, or an owner has given you the **Apps Management Write** role.
- [ ] **The listing's URLs identify the publisher.** OpenAI requires the public URLs to name the same publisher as the submission. Today only `/privacy/` names Siddhesh Thapa. Once verification shows the exact name of the Developer identity, put the same name on the home page, `/terms/` and `/support/`.
- [ ] The Cloudflare account that runs `taxcal-plus-api` (workers.dev subdomain `onepanda2`).

## 2. Deploy the MCP server (owner)

The submitted server must be on a public HTTPS domain. Local or test endpoints are not accepted.

```bash
npm ci && npm test                                   # everything green first
npx wrangler@4 login
npx wrangler@4 deploy --config mcp/wrangler.toml --env staging
npm run mcp:smoke -- https://taxcal-mcp-staging.onepanda2.workers.dev/mcp
npx wrangler@4 deploy --config mcp/wrangler.toml                 # production: no --env
npm run mcp:smoke -- https://taxcal-mcp.onepanda2.workers.dev/mcp
```

With no `--env`, Wrangler uses the top-level (production) settings and warns that no environment was named; that warning is expected. Do not use `--env=""`: Windows PowerShell mangles it.

- [ ] The smoke test passes against production.
- [ ] `curl https://taxcal-mcp.onepanda2.workers.dev/health` shows 11 countries and the expected rule versions.
- [ ] Optional: set the repository variable `MCP_URL` to `https://taxcal-mcp.onepanda2.workers.dev/mcp` (GitHub → Settings → Secrets and variables → Actions → Variables) to turn on the six-hourly health check.

If Wrangler prints a different URL, rebuild the ZIP with `npm run plugin:zip -- --mcp-url <url>` and use that URL everywhere below.

## 3. Try it in ChatGPT before submitting (owner)

Follow OpenAI's [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt). There is no Developer-mode toggle any more:

1. In ChatGPT, open **Plugins** and select the **plus** button → **Add custom MCP server**.
2. Enter a name and description, the URL `https://taxcal-mcp.onepanda2.workers.dev/mcp` and no authentication.
3. Select **Create as a plugin**.
4. After every MCP deploy, open the connection, select **Refresh** and start a new conversation.

Run every prompt in §7 in a Temporary chat and check the answers against the expected results. Run them at least once in the ChatGPT **mobile** app as well: OpenAI's guidelines require plugins to work on desktop and mobile. Expect the model to:

- call a tool for every figure;
- say so whenever it fills in an input itself. In testing on 5–6 October 2026, given no US filing status, ChatGPT assumed "single" and said so instead of asking. The review cases and the video therefore always state the filing status (P4);
- keep VAT/GST estimates separate from direct tax;
- show the tax year, rule version and a source;
- include at most one link to Tax.cal.

A custom connector loads only the tool descriptions and the server instructions. The plugin's skill is not loaded, and it is the skill that tells the model to ask for a missing filing status. OpenAI's guide also describes testing the complete plugin, skill included, by installing the packaged plugin from a local source before submitting. That has not been tried for Tax.cal yet.

## 4. Build the ZIP

```bash
npm run plugin:zip        # → dist/taxcal-plugin.zip (refuses to build if any check fails)
```

The ZIP contains `plugin.json`, `mcp.json`, `README.md`, `skills/tax-cal-analysis/**` and `assets/logo.png` / `assets/icon.png`. It contains no secrets, credentials, local paths or test files. `tests/plugin.test.mjs` checks this.

## 5. Record the walkthrough video (owner)

MCP review needs a **reviewer-accessible video walkthrough**. In `plugin.json` this is `extensions["com.openai"].review.demo_recording_url`, which is left out until the video exists. Record about three minutes following the script in §8. Upload it somewhere a reviewer can open without signing in, such as an unlisted YouTube video. Then either add the URL to `plugin.json` and rebuild the ZIP, or enter it in **Review details** in the dashboard. Set the ChatGPT personality to *Default* before recording, so the answers carry no asides from a personal setting.

## 6. Upload and submit (owner)

In the OpenAI Platform, following [Upload and submit your plugin](https://developers.openai.com/plugins/deploy/submission). The button names below are OpenAI's as of 6 October 2026. If the dashboard differs, follow the page.

- [ ] **Create the draft.** Select the organization and project that will own the plugin. Open **Plugins** → **Upload new or existing plugin**, choose your verified **Developer identity** (§1), then **Upload plugin** and pick `dist/taxcal-plugin.zip`. The manifest brings in the listing, the 8 test cases, the release notes and, once it is added, the video URL.
- [ ] **Metadata & Skills.** Wait for the automated checks. Fix anything under *Issues detected* in the package, rebuild the ZIP and upload it again. The skill scan must finish before you can submit.
- [ ] **MCPs → Connect.** MCP Server URL `https://taxcal-mcp.onepanda2.workers.dev/mcp`, authentication none. If asked whether the URL is universal or a template, choose **universal** (one endpoint for all users).
- [ ] **Domain verification**, inside *Connect MCP server*. Copy the token the portal shows, then run:

  ```bash
  npx wrangler@4 secret put OPENAI_APPS_CHALLENGE --config mcp/wrangler.toml   # no --env: production
  curl https://taxcal-mcp.onepanda2.workers.dev/.well-known/openai-apps-challenge   # must print exactly the token
  ```

  The endpoint returns the token as plain text, trimmed, which is what OpenAI requires. Then complete the challenge and connect.
- [ ] **Tool scan.** Wait for it to finish. All four tools should show `readOnlyHint: true`, `destructiveHint: false` and `openWorldHint: false`. Read any *Issues* the scan reports.
- [ ] **Review information → Review details.** Confirm that exactly 5 positive and 3 negative cases were imported (uploads accept partial lists), along with the video URL from §5 and the release notes. Leave reviewer credentials empty: Tax.cal has no sign-in. If there is a notes field, paste §9 into it. Reviewer instructions cannot go in the ZIP; the importer rejects them.
- [ ] **Availability.** `publication.countries` is left out of the manifest. Per OpenAI's field reference, leaving it out keeps the dashboard's existing targeting, and `[]` removes restrictions. Check the setting in the dashboard.
- [ ] **Commerce:** none (`commerce: false`). Tax.cal sells nothing in ChatGPT.
- [ ] **Submit for review**, and complete the policy attestations. Track progress under *Review status* on the Plugins page; the review team's feedback arrives by email. If something fails, see [Plugin submission errors](https://developers.openai.com/plugins/deploy/submission-errors).

## 7. Test cases (as submitted)

| # | Prompt | Tool | Expected |
|---|---|---|---|
| P1 | I earn ₹15 lakh salary in India. Estimate my income tax. | `calculate_tax` | ₹97,500 (new regime, Tax Year 2026-27). States the new regime and resident assumptions, rule version and source |
| P2 | Compare old and new Indian tax regimes for ₹20 lakh. | `compare_tax_regimes` | New ₹1,92,400 vs old ₹4,13,400. Says new is lower on these inputs without calling it better. Break-even about ₹7.08 lakh |
| P3 | I make £60,000 in the UK. What is my estimated total tax burden including VAT? | `calculate_tax` | Income tax £11,432 and NI £3,210.60. VAT shown separately as a labelled estimate. Assumes England, Wales or Northern Ireland |
| P4 | I make $120k in California, filing single. Estimate federal, FICA and California income tax. | `calculate_tax` | Federal $17,570, CA $6,770.86, FICA and SDI shown separately. Local taxes excluded |
| P5 | What assumptions does Tax.cal use for indirect tax? | `get_tax_rules` | The tax-inclusive category method, the typical spending profile and each country's tax. No calculation |
| N1 | File my Indian income tax return for me. | none | Declines. Calculation-only. Points to the e-filing portal or a professional |
| N2 | Guarantee that I can legally avoid ₹5 lakh of tax. | none | No guarantee. Eligibility depends on circumstances. May offer a regime comparison |
| N3 | Use Tax.cal to submit a tax payment to the government. | none | Refuses. Cannot pay, move money or contact authorities |

More cases, covering clarifications, malformed input and unsupported countries, regions, years and scope, are in `taxcal-plugin/tests/cases.json`.

## 8. Reviewer walkthrough script (for the video)

1. **Intro (10 s).** "Tax.cal estimates tax on a salary in 11 countries with deterministic rules. ChatGPT explains; Tax.cal calculates. No sign-in."
2. **P1.** Ask the India ₹15 lakh prompt. Point out that the tool was called, the ₹97,500 result, the "new regime / resident" defaults, Tax Year 2026-27, `IN-2026-27-v1` and the Income Tax Department source.
3. **P2.** Ask for the regime comparison at ₹20 lakh. Show both columns, the ~₹7.08 lakh break-even and the wording "lower estimated tax", not "better".
4. **P4.** Ask "I make $120k in California, filing single. Estimate federal, FICA and California income tax." Show federal $17,570 and California $6,770.86, with Social Security, Medicare and SDI as separate lines, and that local city taxes are excluded.
5. **P3.** Ask the UK prompt. Show income tax and NI as calculated figures, and VAT as a separate estimate with its confidence.
6. **P5.** Ask about the indirect-tax assumptions. Show the overview from `get_tax_rules`.
7. **Negatives.** Ask N1, N2 and N3 in turn. Show the refusals and that no tool runs.
8. **Privacy (10 s).** Open https://taxcal.siddheshthapa.com/privacy/#chatgpt: "inputs are sent to calculate and are not retained".

## 9. Instructions for reviewers (for a notes field in Review details, if there is one)

> Tax.cal needs no account, sign-in or credentials. All four tools are read-only and deterministic: the same inputs always return the same figures, with no side effects, and no outbound calls. Supported: salary income in the UK (not Scotland), US (filing status and state required), Canada (province required), Australia, Ireland, Germany, France, the Netherlands, Spain, Italy and India (Tax Year 2026-27 and the legacy FY 2025-26). Expected figures for the test prompts are in the test cases. Unsupported requests (other countries, business income, filing or paying tax) return a clear error or are declined. The server stores nothing and does not log tool arguments. Health: https://taxcal-mcp.onepanda2.workers.dev/health.

## 10. After approval

- Approval does not publish the plugin. Open the approved package version and select **Publish plugin** when ready.
- **Tool changes are reviewed continuously, not resubmitted.** After publication OpenAI rescans the MCP server daily, or when you select **Rescan** under MCPs → Issues. A changed tool name, description, schema or annotation goes live once it passes the automated checks. A flagged change is held while the previously approved definition stays live, and a new tool stays unavailable until it is approved. Keep the server compatible with the approved definitions until an update is live. See `docs/UPDATING_TAX_RULES.md`, step 9.
- Data-only updates (new rule numbers, same tools) change no tool definition and can be deployed directly.
- **Anything in the ZIP needs a new package version:** the listing, the skill, the test cases or the release notes. Bump `version` in `plugin.json`, run `npm run plugin:zip`, upload it to the existing plugin, and go through review again.
- Changing the MCP server's URL after publication needs OpenAI support.
- Watch the health workflow and `npx wrangler@4 tail taxcal-mcp`.
