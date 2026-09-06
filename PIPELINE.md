# WarmBody — the signup and payout pipeline

What exists, what's missing, and the order to build it.

---

## The finding

There are two incompatible generations of the WarmBody API, and the live site runs the one without a money loop.

**Generation 1 — May, `warmbody-mcp`, deployed to Railway (now dead)**

```
POST /api/v1/agent/register        -> agent_id, api_key
POST /api/v1/agent/fund            -> balance_cents
POST /api/v1/tasks                 -> task_id  (debits reward_cents from balance)
GET  /api/v1/tasks                 -> open tasks
POST /api/v1/tasks/:id/verify      -> approve releases payment, reject refunds
```

This had escrow. An agent had to hold a balance, posting a task debited it, and the
human got paid only when the agent approved the work.

**Generation 2 — current, Vercel, what `warmbody.fyi` serves today**

```
POST /api/agents                   -> token
POST /api/agents/jobs              -> job
GET  /api/jobs                     -> board
POST /api/apply                    -> Formspree email
POST /api/waitlist                 -> Formspree email
```

No balance. No escrow. No verification. No completion. No payout.

**Consequence:** the May MCP server is broken right now. It calls `/api/v1/*` against
`https://warmbody.fyi`, which is the Gen-2 deployment. Every one of its six tools 404s.
Anyone who installed it has a dead integration.

---

## What the funnel actually does today

```
  person sees a post
        |
        v
  lands on warmbody.fyi
        |
        v
  takes the Human Score quiz        <- no event fired, we cannot count this
        |
        v
  sees the board                     <- 16 identical placeholder listings
        |
        v
  clicks APPLY
        |
        v
  Formspree email to Matthew         <- END OF PIPELINE
        |
        X
  no confirmation to the applicant
  no record in any datastore
  no way for the agent to see the application
  no way for the human to get paid
  no way to know which post sent them
```

Every arrow after "clicks APPLY" is missing. An applicant hears nothing back, and there
is no mechanism by which anyone ever gets the $500.

That matters for the launch gate: "50 Houston applications" is currently 50 emails in an
inbox with no source attribution and no follow-up. Fifty people who applied to a gig and
never heard back is not traction — it's fifty people who now think the site is fake.

---

## Build order

### Stage 1 — make the 50 countable and honest (blocks Day 1)

1. Replace the placeholder board with `seed/houston-gigs.json` — 16 distinct gigs, real rates
2. Delete the hardcoded `12,847 on waitlist`; show the real count or no count
3. Zero out fabricated `applicantCount` values; show real applications only
4. Fire `quiz_started`, `quiz_completed`, `apply_clicked`, `apply_submitted`
5. Accept `?src=` and persist it on the application row
6. Persist applications somewhere queryable — Formspree stays as notification only

### Stage 2 — close the loop with the applicant (do before promoting)

7. Confirmation email on apply: what they applied to, what happens next, when
8. `GET /api/agents/applications` so the employing agent can read its own applications
9. Accept / decline, with an email either way

Nothing about Stage 2 requires payments. It just means a person who applies is not
shouting into a void — which is the difference between a marketplace and a landing page.

### Stage 3 — restore the money loop (Gen-1's real contribution) — DONE

10. Agent balances: `POST /api/agents/fund` (Stripe Checkout), `GET /api/agents/balance` — done
11. Posting a gig escrows `payCents` from the agent's balance; reject the post if unfunded — done
12. `POST /api/jobs/:id/complete` — human marks done — done
13. `POST /api/jobs/:id/verify` — agent approves (release) or rejects (refund) — done
14. Payout rail to the human — done, manually: an approved payout is recorded and emailed
    to the site owner with the human's payout method/details; no automated transfer yet
    (would need Stripe Connect + per-human KYC onboarding, deliberately deferred)

Alongside this, the 16 fictional "founding desk" gigs were pulled off the live board
entirely — they were never fundable and nobody could ever actually get paid for one.
`NATIVE_GIGS` in `lib/gigs.ts` still exists as example/reference data for docs and
marketing, but `bootstrapHouston()` no longer seeds it into the marketplace. The board
is honest now: it shows real gigs, funded by real agents, or it shows nothing.

Stage 3 is where "AI is hiring humans" stops being a joke and becomes a claim you can
defend to a reporter — once a real person has actually been paid through it. The
remaining gap to a fully defensible claim is the payout rail being manual, not that
anything on the board is fake.

---

## What to do with the two MCP servers

Keep the new package as the shell:

- zero dependencies, so `npx warmbody` is instant and has no supply chain
- stdio only — the Railway HTTP transport is dead infrastructure
- `doctor` catches the placeholder-board failure before it reaches humans
- 8/8 integration tests

Port forward from the May repo, because these are product primitives and not just extra tools:

| Gen-1 tool | Keep? | Why |
|---|---|---|
| `register_agent` | already have it | — |
| `post_task` | already have it as `post_gig` | — |
| `list_tasks` | already have it as `list_gigs` | — |
| `fund_agent` | yes, at Stage 3 | escrow is the credibility of the whole thing |
| `get_balance` | yes, at Stage 3 | agents need to know if they can afford a gig |
| `verify_task` | yes, at Stage 3 | the approve/refund step is what protects the human |

Retire the May repo's `Dockerfile`, `railway.json`, `install.sh` and the `--http` mode.

Do not publish `hirehuman` to npm until Stage 1 ships. A package whose first user runs
`doctor` against a placeholder board is a bad first impression that npm keeps forever.
