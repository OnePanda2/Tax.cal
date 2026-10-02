#!/usr/bin/env node
/* Build dist/taxcal-plugin.zip — the file uploaded to the OpenAI Platform.

     npm run plugin:zip
     npm run plugin:zip -- --mcp-url https://taxcal-mcp.<subdomain>.workers.dev/mcp

   Refuses to build if the package fails any check (limits, missing review
   cases, secrets, local paths, broken skill links). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, checkPackage, packageEntries, buildZip } from './plugin-package.mjs';

const i = process.argv.indexOf('--mcp-url');
const mcpUrl = i > 0 ? process.argv[i + 1] : undefined;

const problems = checkPackage({ mcpUrl });
if (problems.length) {
  console.error('The plugin package is not ready:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
const entries = packageEntries({ mcpUrl });
const zip = buildZip(entries);
mkdirSync(join(ROOT, 'dist'), { recursive: true });
const out = join(ROOT, 'dist', 'taxcal-plugin.zip');
writeFileSync(out, zip);
console.log(`Wrote dist/taxcal-plugin.zip (${(zip.length / 1024).toFixed(1)} KB, ${entries.length} files):`);
for (const e of entries) console.log('  ' + e.name);
