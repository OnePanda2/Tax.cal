# Tax.cal plugin

Tax.cal estimates the tax on a salary in 11 countries with a deterministic tax engine, and explains each figure with its tax year, rule version, confidence, assumptions and official sources. The model never does the tax arithmetic: the Tax.cal MCP server does.

This folder is a portable [Agent Plugins](https://agent-plugins.org/) 1.0.0 package with OpenAI's `com.openai` extension. It contains a manifest, one remote MCP server and one skill.

## What it can do

- **Calculate** the estimated income tax, social contributions, state, provincial or regional tax and take-home pay on a salary, for the UK (England, Wales, Northern Ireland), US (federal and every state), Canada (every province), Australia, Ireland, Germany, France, the Netherlands, Spain, Italy and India.
- **Compare India's regimes:** the new regime against the old, for Tax Year 2026-27 under the Income-tax Act, 2025, or FY 2025-26 (AY 2026-27) under the 1961 Act.
- **Estimate the tax inside spending** (VAT, GST, sales tax and fuel duty). This is shown separately and labelled as an estimate.
- **Compare countries** on the same salary at dated, approximate exchange rates. It compares tax rules, not cost of living.
- **Explain the rules:** rates, assumptions, exclusions, sources, and when each rule set was last verified.

It does **not** file returns, submit forms, make payments, contact tax authorities or give personal advice. It does not cover business income, capital gains, foreign income, HUFs, firms or companies.

## Contents

```
taxcal-plugin/
  plugin.json                     Manifest (Agent Plugins 1.0.0 + extensions["com.openai"])
  mcp.json                        The Tax.cal MCP server (streamable HTTP, no credentials)
  skills/tax-cal-analysis/        The workflow the model follows, with references
  assets/logo.png, assets/icon.png
  tests/cases.json                Conversation test cases (kept in the repo, not shipped in the ZIP)
```

## Tools (served by the MCP server)

| Tool | Purpose |
|---|---|
| `calculate_tax` | One salary, one country: tax, take-home pay, breakdown, confidence, sources |
| `compare_tax_regimes` | India: new vs old regime, side by side, with the break-even deductions |
| `get_tax_rules` | The rules, assumptions and sources for one country, or an overview of all |
| `compare_countries` | One salary across countries (tax rules only) |

All four are read-only (`readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`) and return structured content that matches a declared `outputSchema`.

## Install

- **ChatGPT:** once the plugin is published in the directory, add Tax.cal from there. Before then, developers can upload the ZIP (see below) in the OpenAI Platform dashboard.
- **Other Agent Plugins clients:** install this folder as a plugin.
- **Any MCP client:** add `https://taxcal-mcp.onepanda2.workers.dev/mcp` as a streamable-HTTP MCP server. This gives the tools without the skill.

No sign-in is needed.

## Privacy

Your figures are sent to Tax.cal's calculation service only to compute the answer. They are not stored, and they are not written to logs. Each request leaves one operational log line: the tool, the country code, success or failure, and the duration. See the [privacy policy](https://taxcal.siddheshthapa.com/privacy/).

## Build the ZIP

From the repository root:

```bash
npm run plugin:zip            # → dist/taxcal-plugin.zip
```

The build checks OpenAI's listing limits, the five positive and three negative review cases, the skill format, and the absence of secrets or local paths, and it refuses to build if any check fails. If the MCP server is deployed somewhere else, add `-- --mcp-url https://…/mcp`.

## Support

[taxcal.siddheshthapa.com/support](https://taxcal.siddheshthapa.com/support/) · [Terms](https://taxcal.siddheshthapa.com/terms/) · [Source code](https://github.com/OnePanda2/Tax.cal)
