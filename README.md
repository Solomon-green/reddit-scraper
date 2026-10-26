# Reddit Scraper — job radar

Finds Reddit posts from people **hiring** for AI automation, Google Workspace and GTM work,
and drops freelancers advertising themselves (`[For Hire]`, `[Offer]`, ...).

```
GitHub Actions (every 30 min)
  agent/run.py
    reddit.py    public RSS feeds: job boards + Reddit-wide searches (paced for rate limits)
    config.py    subreddits, searches, rule filters (FOR_HIRE / HIRING / TOPIC)
    classify.py  Claude Haiku: real client job? category, score, budget, summary
    store.py     Supabase table reddit_jobs (deduped by post id)
web/             Next.js dashboard on Vercel (reads reddit_jobs)
```

## Run locally

```bash
python agent/run.py --dry-run   # collect + rules only, prints candidates
python agent/run.py             # needs SUPABASE_URL, SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY
```

## Secrets (GitHub → Settings → Secrets and variables → Actions)

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://yeqkzoridnagvhlxlvvs.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → secret key (`sb_secret_...`) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |

Reddit closed self-service API keys (Nov 2025), so the agent uses Reddit's public RSS feeds.
If official API access is granted later, only `agent/reddit.py` changes.
