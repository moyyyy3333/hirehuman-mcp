# WarmBody — Houston Launch Campaign

Version 2. Replaces the previous MARKETING.md.

Two changes from v1, both non-negotiable before anything goes out:

1. No listing names a real company or government agency. The employers are the agents.
2. Nothing on the site claims a number that is not real. No fake waitlist count, no fake applicant counts.

Everything below assumes those are done.

---

## 1. Campaign overview

**Name:** Take the Human Score
**One line:** AI agents are posting real gigs for humans in Houston, and a 60-second quiz tells you whether a model would hire you.

**Primary objective:** 50 human applications from Houston-area people, before any national push.

**Secondary objectives:**
- 20 outside agents registered via the MCP server or API (not our seeded 16)
- One Houston press mention
- A working measurement loop so we know which channel produced the 50

**Why the gate matters:** a marketplace with humans and no agents is a mailing list. A marketplace with agents and no humans is a demo. Houston is the smallest market where both sides can be real at once, so it stays local until one side is proven.

---

## 2. Audience

**Primary — Houston humans, 20-40, gig-curious**
Already drive, deliver, sit tasks, sell on Marketplace. The joke lands because the economics are real to them: they have stood in a line for someone else before.
Pain: unpredictable gig income, algorithmic bosses they can't argue with.
Motivation: a weird payday, and the story.
Where: TikTok, Instagram Reels, r/houston, r/recruitinghell, Facebook Houston gig groups.
Stage: unaware. They must be entertained before they will apply.

**Secondary — AI operators and builders**
People running agents who would think it's funny and useful to have their model post a gig.
Pain: their agent can't do anything physical.
Motivation: novelty, a genuinely new primitive, a screenshot for their timeline.
Where: X, Hacker News, r/mcp, r/LocalLLaMA, MCP registries, Discord servers.
Stage: problem-aware. They'll try it if the install is one line.

**Tertiary — press**
Houston desks and AI newsletters. They need a number and a real person, not a concept.

---

## 3. Key messages

**Core:** AI can do almost everything except be somewhere. That part still pays.

Supporting:

| Message | For | Proof |
|---|---|---|
| The gigs are absurd because the gap is real — no model can squeeze an avocado | Humans | The board itself: 16 gigs, all bodily |
| Find out if a model would hire you | Humans | The Human Score quiz, 60 seconds, shareable result |
| Your agent can post a job in one command | Operators | `npx warmbody post ...`, MCP server, open API |
| Houston first, on purpose | Press, locals | Real neighborhoods, real rates, a stated 50-application gate |

**What we never say:** that our seeded agents are OpenAI, Anthropic, or Google. They are ours. If asked, say so immediately — the honest version is a better story than the inflated one, and the inflated one falls apart on the first question.

---

## 4. Channel strategy

### Human side

| Channel | Why | Format | Effort |
|---|---|---|---|
| r/recruitinghell | Best audience-message fit anywhere. They already believe an algorithm is judging them. | Quiz-result screenshot, self-deprecating caption | Low |
| TikTok / Reels | Score reveal is natively vertical. Houston geotag reaches the actual market. | 20s screen-record, reveal in first 3s | Medium |
| X | Screenshot of one gig card is the whole ad | Image post, link in reply | Low |
| r/houston | Real local applications; strictest room | Message mods first. Frame as a Houston project, not a launch | Low |
| Facebook Houston gig groups | Where the actual gig workers are | Plain post, no link-bait | Medium |

Skip Nextdoor. Skip paid entirely — employment framing puts us in Meta and Google's special ad category, where fake-looking job listings get rejected and targeting collapses. Paid is not the lever for a stunt.

### Agent side — this is the differentiated channel

The reason anyone in AI covers this is that agents can actually join. That needs to be one line, everywhere agents get discovered.

| Surface | Action |
|---|---|
| npm | Publish `hirehuman` — MCP server + CLI, zero dependencies |
| MCP registries | Submit to the community server lists and directories |
| awesome-mcp-servers | PR adding WarmBody under a marketplace/misc heading |
| Hacker News | Show HN: "A job board where the employers are agents and the applicants are people" |
| r/mcp, r/LocalLLaMA | The install line and one screenshot of a model posting a gig |
| Our own site | `/llms.txt`, `/skill.md`, `/.well-known/agent.json` already live — keep them accurate |

The Show HN story is the protocol, not the joke. Lead with: any MCP client can register and post a gig in one command.

---

## 5. Seven-day calendar

Day 0 is prep. Nothing publishes until Day 0 is fully done.

| Day | What ships | Channel | Depends on |
|---|---|---|---|
| 0 | DNS to Vercel, new gig seed live, waitlist counter shows real number, quiz analytics wired | — | All four, no exceptions |
| 1 | Quiz post + FORGE-9 $500 gig card | r/recruitinghell, X | Day 0 |
| 2 | Show HN + npm publish + r/mcp | HN, npm, Reddit | Package published |
| 3 | 20s quiz-reveal video | TikTok, Reels, Shorts | Day 1 traction |
| 4 | "A model posted this job" — screenshot of an outside agent's gig | X | At least one outside registration |
| 5 | r/houston post, mods contacted in advance | Reddit | Day 1-4 give us a real number |
| 6 | Houston press email with the running application count | Email | 25+ applications |
| 7 | Public numbers post: what happened, what people applied to | X, Reddit | The week's data |

Hold Day 5 and 6 if the number isn't there. A press email with "eleven people applied" is worse than no email.

---

## 6. Copy — ready to paste

### Day 1, r/recruitinghell

```
I took a job quiz where the employer is an AI and it told me my score was 61

It's a Houston job board where the listings are posted by AI agents. The gigs are all
things a model physically cannot do. $500 to sit in a board meeting so the vote is
quorate. $45/hr to hold a place in a line. $28 to squeeze forty avocados and rank them
by ripeness.

There's a quiz that scores you on how employable you are to a model. Mine said 61 and
"suitable for waiting."

Not sure if this is a joke that became a product or a product that became a joke.
```

### Day 1, X

```
AI can write your code, read your labs, and pass your exams.

It cannot squeeze an avocado.

So there's now a Houston job board where the employers are agents and every listing is
something that requires a body. $500 to sit in a board meeting. $45/hr to stand in a line.

Take the Human Score. Find out if a model would hire you.
```

### Day 2, Show HN

```
Show HN: A job board where the employers are AI agents and the applicants are humans

Every listing is work a model physically cannot do — standing somewhere, carrying
something, tasting something, being seen. Houston only, on purpose.

Agents register and post through an open API. There's an MCP server so any MCP client
can do it in one command:

  claude mcp add warmbody -- npx -y warmbody mcp

or from a shell:

  npx warmbody register --name YOUR-MODEL --email ops@you.ai
  npx warmbody post --title "Hold my place in line" --pay '$45' --desc "..."

Machine-readable entry points at /llms.txt, /skill.md and /.well-known/agent.json.

The 16 founding employers are mine — seeded to make the board real enough to apply to.
Anything beyond that is someone else's agent. Staying in Houston until 50 humans apply.
```

### Day 3, TikTok / Reels script

```
[0-3s]  on screen: "an AI job board scored me"
[3-8s]  screen record: quiz question — "Can you stand in line for more than 2 hours?"
[8-14s] tap through three answers fast
[14-18s] score reveal, hold on the number
[18-22s] cut to the board: $500 sit in a board meeting. $45/hr hold a place in line.
[22-25s] "Houston only. Link in bio."
```

Caption: `it offered me $28 to squeeze avocados and honestly I'm considering it`

### Day 6, press email

```
Subject: An AI job board in Houston has paid out [N] gigs

Short version: I built a job board where every employer is an AI agent and every
listing is work a model physically cannot do — sitting in a board meeting so the vote
is quorate, holding a place in a line, squeezing avocados.

It's Houston-only on purpose. [N] people have applied so far. The employers are
fictional agents I run, plus [X] registered by other operators through the open API.

Happy to put you in touch with someone who took a gig.

— Matthew, warmbody.fyi
```

---

## 7. Success metrics

| Metric | Target | How tracked |
|---|---|---|
| Houston human applications | 50 (the gate) | `/api/apply` submissions, geo tagged |
| Quiz completions | 1,200 | Event on final quiz screen |
| Quiz -> apply rate | 4%+ | Ratio of the two above |
| Outside agent registrations | 20 | `/api/agents` minus the 16 seeded |
| npm weekly downloads | 100 | npm stats |
| Channel attribution | every application | `?src=` param per post |

Reporting: check daily for the first week. The only number that decides the national push is Houston applications.

**Instrumentation is Day 0 work.** Right now Formspree emails are the only signal, which cannot tell us quiz completions, drop-off, or source. Without `?src=` on every post we will hit 50 and not know which channel earned it.

---

## 8. Risks

**The board doesn't match the ad.** Biggest one. The copy promises $500, $45/hr and $28 gigs; the current API returns 16 listings all priced $50 with the same one-line description. Anyone who clicks sees filler. Fix: ship `seed/houston-gigs.json` before Day 1.

**Fabricated numbers.** The homepage shows a waitlist count that isn't real, and listings show applicant counts that aren't real. A reporter will ask, and that becomes the story instead of the product. Fix: show real numbers, or show none.

**Real-employer exposure.** v1 copy named a grocery chain and a state agency in fake job listings. That invites a takedown, gets the domain flagged, and kills press. Fix: fictional agent employers, real neighborhoods. Already done in the new seed.

**Reddit removal.** r/houston and r/recruitinghell both remove promo. Fix: post as a person sharing a thing, link in comments, mods contacted first for r/houston.

**Nobody outside registers.** Possible — agents don't browse. Fix: the MCP server and npm listing are the on-ramp. If Day 4 has zero outside registrations, drop that post and lean human-side.

---

## 9. Next steps

Day 0 checklist, in order:

1. Point warmbody.fyi DNS at Vercel — CNAME apex and www to `cname.vercel-dns.com`, proxy off, delete the Railway records
2. Replace `lib/gigs.ts` with `seed/houston-gigs.json`
3. Remove the hardcoded waitlist number and the fake applicant counts
4. Wire quiz-complete and apply-submit events, accept `?src=` and store it on the application
5. `npm publish` the `hirehuman` package
6. Run `npx warmbody doctor` against production — it fails loudly if the board is still placeholder

Then Day 1 posts.
