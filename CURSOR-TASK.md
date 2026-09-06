# Stage 1 — paste this into the Cursor agent that has the code

You are working in the WarmBody Next.js app (the one with `app/`, `components/`,
`lib/gigs.ts`) that deploys to `warmbody.fyi` on Vercel. Do all six items, then push.

---

## 1. Replace the placeholder gig board

`lib/gigs.ts` currently returns 16 listings that all have `pay: "$50"` and the description
"Houston body work that machines cannot do." Titles are `"<CALLSIGN> gig"`.

Replace the entire gig dataset with the 16 gigs in `houston-gigs.json` (provided
alongside this file). Keep the existing exported function signatures and the field names
the board already consumes — `id, ai, agentId, emoji, category, title, desc, pay,
payLabel, payCents, neighborhood, location, lat, lng, requirements, applicantCount,
applyUrl, source` — so `JobBoard.tsx` and `/api/jobs` need no changes.

Verify after: `GET /api/jobs` returns 16 gigs with 16 distinct `pay` values and 16
distinct `desc` values.

## 2. Show pay on the card

The live board renders title and description but no rate. Add `pay` and `payLabel` to the
gig card in `components/JobBoard.tsx`. The rate is the entire hook — "$500" has to be
visible without clicking.

## 3. Kill the fake waitlist counter

The header renders a hardcoded `12,847 on waitlist`. Remove the hardcoded number.
Either render the real count from the waitlist store, or render nothing. Do not render a
placeholder, a rounded number, or a "12,847+".

## 4. Zero the fabricated applicant counts

Gigs ship with `applicantCount` values like `10` and the board renders "10 applied".
The new seed sets every one to 0. Make the board render the real stored count, and hide
the line entirely when the count is 0 rather than printing "0 applied".

## 5. Fire the funnel events

There is currently no way to count anything. Add four events:

| Event | Fires when |
|---|---|
| `quiz_started` | first quiz question renders |
| `quiz_completed` | score screen renders (include the score) |
| `apply_clicked` | APPLY button clicked (include `jobId`) |
| `apply_submitted` | `/api/apply` returns 200 (include `jobId`) |

Use whatever analytics is already wired; if none is, use `@vercel/analytics` `track()`.

## 6. Capture the traffic source

Read `?src=` from the URL on first load, persist it for the session, and include it in the
`POST /api/apply` body. Store it on the application record.

Every launch post will carry a different `?src=` value, and without this we cannot tell
which channel produced an application.

---

## Acceptance

Run these against the deployment before you call it done:

```bash
# 16 distinct rates and 16 distinct descriptions
curl -s https://warmbody.fyi/api/jobs | node -e '
  const d=JSON.parse(require("fs").readFileSync(0));
  const pays=new Set(d.jobs.map(j=>j.pay)), descs=new Set(d.jobs.map(j=>j.desc));
  console.log("gigs",d.jobs.length,"pays",pays.size,"descs",descs.size);
  process.exit(d.jobs.length===16 && pays.size===16 && descs.size===16 ? 0 : 1);
'

# no fabricated waitlist number anywhere in the HTML
curl -s https://warmbody.fyi | grep -c "12,847" # must be 0

# source attribution survives to the application
# submit a test apply from https://warmbody.fyi/?src=smoketest
# then confirm the stored application has src === "smoketest"
```

Or, from the `hirehuman` package:

```bash
WARMBODY_BASE_URL=https://warmbody.fyi npx warmbody doctor
```

`doctor` fails loudly if the board is still placeholder — it checks distinct pay rates and
distinct descriptions specifically because that is the failure mode that reads as fake.

---

## Do not

- Do not name a real company or government agency in any listing. The employers are the
  fictional agents. Real neighborhoods and street names are fine and wanted.
- Do not add back any count, badge, or social-proof number that is not read from real data.
- Do not touch `/llms.txt`, `/skill.md`, or `/.well-known/agent.json` except to correct
  the agent and job counts if they are hardcoded.

## Then push

Push to a GitHub repo on the `moyyyy3333` account so the source stops living only in this
workspace. Connect that repo to the Vercel project so future deploys are traceable.
