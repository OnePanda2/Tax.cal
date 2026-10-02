/* Tax.cal MCP server — Cloudflare Worker entry point.
   The Workers runtime treats every named export of this module as an
   entrypoint, so it exports the handler only; the logic lives in app.js. */
import { handle } from './app.js';

export default { fetch: handle };
