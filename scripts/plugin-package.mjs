/* ============================================================================
   Tax.cal plugin package: file list, checks and a reproducible ZIP.

   Used by scripts/build-plugin-zip.mjs (to build dist/taxcal-plugin.zip) and
   by tests/plugin.test.mjs (to validate the package). No dependencies: the
   ZIP writer uses node:zlib, entries are sorted and timestamps fixed, so the
   same sources always give byte-identical output.
   ========================================================================== */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PLUGIN_DIR = join(ROOT, 'taxcal-plugin');

/* Shipped in the ZIP: what plugin clients load. tests/ stays in the repo. */
const EXCLUDE = [/^tests\//, /(^|\/)\./];

export function packageFiles(dir = PLUGIN_DIR) {
  const out = [];
  (function walk(d) {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const rel = relative(dir, p).split(sep).join('/');
      if (EXCLUDE.some((re) => re.test(rel + (statSync(p).isDirectory() ? '/' : '')))) continue;
      if (statSync(p).isDirectory()) walk(p); else out.push(rel);
    }
  })(dir);
  return out;
}

/* ---- checks ----------------------------------------------------------------- */
const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'OpenAI-style API key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/\b(api[_-]?key|client[_-]?secret|password|passwd|bearer)\b\s*[:=]/i, 'credential assignment'],
  [/Authorization\s*:/i, 'authorization header']
];
const LOCAL_PATH_PATTERNS = [
  [/(^|[\s"'(])\/(home|Users|root|tmp)\//, 'local absolute path'],
  [/\b[A-Za-z]:\\\\?(Users|Projects|Windows)\\/, 'Windows path'],
  [/\b(localhost|127\.0\.0\.1|0\.0\.0\.0)\b/, 'local host']
];

export function scanText(rel, text) {
  const problems = [];
  for (const [re, what] of [...SECRET_PATTERNS, ...LOCAL_PATH_PATTERNS]) {
    if (re.test(text)) problems.push(`${rel}: contains a ${what}`);
  }
  return problems;
}

const TEXT = /\.(json|md|txt|svg)$/i;

/* PNG width/height from the IHDR chunk. */
export function pngSize(buf) {
  const sig = '89504e470d0a1a0a';
  if (buf.subarray(0, 8).toString('hex') !== sig || buf.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/* WCAG contrast ratio between two #RRGGBB colours. */
export function contrast(a, b) {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* Everything that would stop the package being submitted or loaded.
   Limits are OpenAI's public-submission limits (developers.openai.com/plugins). */
export function checkPackage({ dir = PLUGIN_DIR, mcpUrl } = {}) {
  const problems = [];
  const files = packageFiles(dir);
  const read = (rel) => readFileSync(join(dir, rel));
  const manifest = JSON.parse(read('plugin.json'));
  const mcp = JSON.parse(read('mcp.json'));
  const ext = manifest.extensions && manifest.extensions['com.openai'];
  if (!ext) return ['plugin.json: missing extensions["com.openai"]'];
  const ui = ext.interface || {};

  const len = (field, v, max) => { if (typeof v !== 'string' || !v.trim() || v.length > max) problems.push(`interface.${field}: must be 1–${max} characters`); };
  len('displayName', ui.displayName, 30);
  len('shortDescription', ui.shortDescription, 30);
  len('longDescription', ui.longDescription, 4000);
  len('developerName', ui.developerName, 100);
  const CATEGORIES = ['Productivity', 'Creativity', 'Developer Tools', 'Business & Operations', 'Data & Analytics', 'Communication', 'Education & Research', 'Security', 'Finance', 'Healthcare', 'Travel', 'Entertainment', 'Other'];
  if (!CATEGORIES.includes(ui.category)) problems.push(`interface.category: "${ui.category}" is not an allowed category`);
  if (!Array.isArray(ui.capabilities) || ui.capabilities.length > 20 || ui.capabilities.some((c) => typeof c !== 'string' || !c.trim() || c.length > 120 || /\n/.test(c))) {
    problems.push('interface.capabilities: at most 20 one-line entries of 1–120 characters');
  }
  if (!Array.isArray(ui.defaultPrompt) || ui.defaultPrompt.length < 1 || ui.defaultPrompt.length > 3 || ui.defaultPrompt.some((p) => typeof p !== 'string' || !p.trim() || p.length > 128)) {
    problems.push('interface.defaultPrompt: 1–3 prompts of at most 128 characters');
  }
  for (const k of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) {
    if (typeof ui[k] !== 'string' || !/^https:\/\/[^\s]+$/.test(ui[k])) problems.push(`interface.${k}: must be an https URL`);
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(ui.brandColor || '') || contrast(ui.brandColor, '#FFFFFF') < 2) problems.push('interface.brandColor: #RRGGBB with at least 2:1 contrast against white');
  if (ui.brandColorDark !== undefined && (!/^#[0-9A-Fa-f]{6}$/.test(ui.brandColorDark) || contrast(ui.brandColorDark, '#212121') < 2)) problems.push('interface.brandColorDark: #RRGGBB with at least 2:1 contrast against #212121');

  const relPath = (field, p) => {
    if (typeof p !== 'string' || !p.startsWith('./')) { problems.push(`${field}: must be a relative path starting with ./`); return null; }
    const rel = p.slice(2);
    if (rel.includes('..') || !files.includes(rel)) { problems.push(`${field}: ${p} is not in the package`); return null; }
    return rel;
  };
  for (const k of ['logo', 'composerIcon']) {
    const rel = relPath(`interface.${k}`, ui[k]);
    if (!rel) continue;
    const buf = read(rel);
    if (buf.length > 5 * 1024 * 1024) problems.push(`${rel}: larger than 5 MiB`);
    const size = pngSize(buf);
    if (!size) problems.push(`${rel}: not a PNG`);
    else if (size.width !== size.height || size.width < 48 || size.width > 4096) problems.push(`${rel}: must be square, 48–4096 px (is ${size.width}×${size.height})`);
  }
  if (ext.onboardingSkill !== undefined) relPath('onboardingSkill', ext.onboardingSkill);

  // Review: exactly five positive and three negative cases for an initial MCP review.
  const tc = ext.review && ext.review.test_cases;
  if (!tc || !Array.isArray(tc.positive) || tc.positive.length !== 5) problems.push('review.test_cases.positive: exactly 5 cases required');
  if (!tc || !Array.isArray(tc.negative) || tc.negative.length !== 3) problems.push('review.test_cases.negative: exactly 3 cases required');
  for (const c of (tc && tc.positive) || []) {
    for (const k of ['description', 'prompt', 'tools_triggered', 'expected_behavior']) if (typeof c[k] !== 'string' || !c[k].trim()) problems.push(`positive case "${c.description}": ${k} is required`);
  }
  for (const c of (tc && tc.negative) || []) {
    for (const k of ['description', 'prompt', 'expected_behavior']) if (typeof c[k] !== 'string' || !c[k].trim()) problems.push(`negative case "${c.description}": ${k} is required`);
  }
  if (typeof ext.review.commerce !== 'boolean') problems.push('review.commerce: must be true or false');
  if (!ext.publication || typeof ext.publication.release_notes !== 'string' || !ext.publication.release_notes.trim()) problems.push('publication.release_notes: required for directory submission');

  // MCP server: the one public endpoint.
  const servers = Object.values(mcp.mcpServers || {});
  if (servers.length !== 1) problems.push('mcp.json: expected exactly one server');
  for (const s of servers) {
    const url = mcpUrl || s.url;
    if (s.type !== 'streamable-http') problems.push('mcp.json: server type must be "streamable-http"');
    if (!/^https:\/\/[a-z0-9.-]+\/mcp$/.test(url)) problems.push(`mcp.json: ${url} must be a public https URL ending in /mcp`);
    if (s.headers || s.env) problems.push('mcp.json: no headers or env (the server needs no credentials)');
  }

  // Skills: Agent Skills frontmatter rules.
  const skillDirs = [...new Set(files.filter((f) => /^skills\/[^/]+\/SKILL\.md$/.test(f)).map((f) => f.split('/')[1]))];
  if (!skillDirs.length) problems.push('skills/: at least one skills/<name>/SKILL.md is required');
  for (const name of skillDirs) {
    const text = read(`skills/${name}/SKILL.md`).toString('utf8');
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!fm) { problems.push(`skills/${name}/SKILL.md: missing YAML frontmatter`); continue; }
    const field = (k) => { const m = new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm[1]); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
    const n = field('name'), d = field('description');
    if (n !== name) problems.push(`skills/${name}/SKILL.md: name "${n}" must match the directory`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n || '') || n.length > 64) problems.push(`skills/${name}/SKILL.md: invalid name`);
    if (!d || d.length > 1024) problems.push(`skills/${name}/SKILL.md: description must be 1–1024 characters`);
    for (const [, link] of text.matchAll(/\]\(((?!https?:|#)[^)\s]+)\)/g)) {
      const target = join(`skills/${name}`, link.split('#')[0]).split(sep).join('/');
      if (!files.includes(target)) problems.push(`skills/${name}/SKILL.md: broken link ${link}`);
    }
  }

  // Nothing secret, local or machine-specific anywhere in what ships.
  for (const rel of files) {
    if (TEXT.test(rel)) problems.push(...scanText(rel, read(rel).toString('utf8')));
  }
  return problems;
}

/* ---- ZIP (store/deflate, reproducible) ----------------------------------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 1 January 2026, 00:00 in MS-DOS date/time format.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

export function buildZip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const { name, data } of [...entries].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(useDeflate ? 8 : 0, 8); local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x031e, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(useDeflate ? 8 : 0, 10); central.writeUInt16LE(DOS_TIME, 12); central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28); central.writeUInt16LE(0, 30); central.writeUInt16LE(0, 32); central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36); central.writeUInt32LE((0o100644 << 16) >>> 0, 38); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, body);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/* Minimal reader for verification: returns Map(name → Buffer), checking CRCs. */
export function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), loff = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
    const lnlen = buf.readUInt16LE(loff + 26), lxlen = buf.readUInt16LE(loff + 28);
    const raw = buf.subarray(loff + 30 + lnlen + lxlen, loff + 30 + lnlen + lxlen + csize);
    const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`);
    out.set(name, data);
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

/* The ZIP's entries; mcp.json can be pointed at another deployment. */
export function packageEntries({ dir = PLUGIN_DIR, mcpUrl } = {}) {
  return packageFiles(dir).map((rel) => {
    let data = readFileSync(join(dir, rel));
    if (rel === 'mcp.json' && mcpUrl) {
      const cfg = JSON.parse(data.toString('utf8'));
      for (const s of Object.values(cfg.mcpServers)) s.url = mcpUrl;
      data = Buffer.from(JSON.stringify(cfg, null, 2) + '\n');
    }
    return { name: rel, data };
  });
}
