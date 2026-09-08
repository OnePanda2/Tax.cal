-- Tax.cal Plus — D1 schema.
-- Deliberately holds no identity: no email, no name, no password, no IP.
-- A review is reachable only by its unguessable link, and deletes itself.

CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY,     -- public handle, 64 bits of randomness
  token_hash    TEXT NOT NULL,        -- SHA-256 of the secret; the secret is never stored
  country       TEXT NOT NULL,
  region        TEXT,
  filing_status TEXT,
  gross         INTEGER NOT NULL,
  marginal_rate REAL NOT NULL,
  answers       TEXT NOT NULL,        -- JSON
  other_text    TEXT,                 -- JSON: free text the user chose to type
  findings      TEXT NOT NULL,        -- JSON snapshot of what they were shown
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL      -- enforced by sweep(), not by convention
);

CREATE INDEX IF NOT EXISTS idx_reviews_expires ON reviews (expires_at);

-- Salted-hash counters for the write limiter. Rows are short-lived and hold
-- no address, only a hash that cannot be reversed to one.
CREATE TABLE IF NOT EXISTS rate_limit (
  key          TEXT PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_window ON rate_limit (window_start);
