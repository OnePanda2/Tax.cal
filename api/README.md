# Tax.cal Plus API

A Cloudflare Worker + D1 database that stores a completed Plus review so it
survives a refresh, a new device, or coming back next week. That is its whole
job.

## The design, and why

**No accounts, no passwords, no email.** A review is reached by an unguessable
link: a 64-bit public id plus a 192-bit secret. The secret is stored only as a
SHA-256 hash, so the link cannot be reconstructed from the database.

That choice buys a lot:

- A breach exposes anonymous answers, not people. There is no identity in the
  table to leak.
- Deletion is self-service, which satisfies the right to erasure without a
  support process.
- No password handling, no email deliverability, no auth code to get wrong.

The cost is real and stated plainly on the privacy page: **lose the link and it
cannot be recovered**, because there is no way to tell which record was yours.
It expires by itself after a year.

## Deploy it

You need a free Cloudflare account. From this directory:

```bash
npx wrangler login
```

Create the database — the location hint keeps the data in Europe, which is
where the customers are:

```bash
npx wrangler d1 create taxcal-plus --location weur
```

Copy the `database_id` it prints into `wrangler.toml`, replacing
`REPLACE_WITH_DATABASE_ID`. Then create the tables:

```bash
npx wrangler d1 execute taxcal-plus --remote --file=schema.sql
```

Set a real salt for the rate limiter (it is only used to hash IP addresses so
they are never stored, but it should not be the default):

```bash
npx wrangler secret put RATE_SALT
```

Deploy:

```bash
npx wrangler deploy
```

Wrangler prints a `https://taxcal-plus-api.<subdomain>.workers.dev` URL.

## Switch it on in the site

Open `assets/plus-api.js` and set the URL near the top:

```js
var BASE = 'https://taxcal-plus-api.<your-subdomain>.workers.dev';
```

Until you do, the site works exactly as before — the results page says saving
is not switched on and offers the PDF instead. Saving is an enhancement, never
a dependency, so a Worker outage degrades the product rather than breaking it.

If you later move the domain's DNS to Cloudflare, uncomment the `[[routes]]`
block in `wrangler.toml` to serve at `api.siddheshthapa.com` instead.

## Run it locally

```bash
npx wrangler d1 execute taxcal-plus --local --file=schema.sql
npx wrangler dev --local --port 8787
```

`plus-api.js` points itself at `http://127.0.0.1:8787` automatically when the
page is served from localhost, so the local site talks to the local worker with
no configuration.

## The API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/review` | Save a review. Returns `{ id, token, expiresAt }`. |
| `GET` | `/review/:id?t=token` | Fetch it. |
| `DELETE` | `/review/:id?t=token` | Delete it permanently. |
| `GET` | `/health` | Liveness check. |

A wrong id, a wrong token and an expired review all return the same 404 with
the same message, so the endpoint cannot be used to discover which ids exist.

## Built-in limits

- **64 KB** max request body; free text is truncated to 2,000 characters per
  field, so it cannot be used as blob storage.
- **20 writes per IP per hour.** The limiter stores a salted hash of the
  address for one window and never the address itself.
- **365-day retention**, swept on every request rather than left to a cron job
  someone forgets to set up.
- Requests are only accepted from the site's own origins (see
  `ALLOWED_ORIGINS` in `src/index.js` — add your domain there if it changes).

## Costs

Comfortably inside Cloudflare's free tier: 100,000 Worker requests a day and
5 GB of D1 storage. A saved review is roughly 4 KB, so storage is not the
constraint you will hit first.
