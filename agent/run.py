"""One agent pass: collect -> rule filter -> skip known -> classify -> store.

Usage:
  python agent/run.py            full run (needs SUPABASE_URL, SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY)
  python agent/run.py --dry-run  collect + rule filter only, print candidates, write nothing
"""
import os
import sys
import time

import config
import reddit


def collect():
    posts, failures = {}, []
    sources = [(name, lambda n=name, s=subs: reddit.subreddits_new(n, s)) for name, subs in config.FEEDS.items()]
    sources += [(f"search: {q[:40]}", lambda q=q: reddit.search(q)) for q in config.SEARCHES]
    for name, fetch in sources:
        t = time.time()
        try:
            for p in fetch():
                posts.setdefault(p.id, p)
        except Exception as e:  # one bad feed shouldn't stop the run
            failures.append(f"{name}: {e}")
        print(f"  {time.time() - t:5.1f}s  {name}")
    return list(posts.values()), failures


def prefilter(posts):
    return [
        p for p in posts
        if p.subreddit.lower() not in config.MUTED_SUBREDDITS
        and not config.FOR_HIRE.search(p.title)
        and config.HIRING.search(f"{p.title} {p.body}")
        and config.TOPIC.search(f"{p.title} {p.body}")
    ]


def main(dry_run):
    started = time.time()
    posts, failures = collect()
    candidates = prefilter(posts)
    print(f"collected {len(posts)} posts, {len(candidates)} pass rules, {len(failures)} feed failures")
    for f in failures:
        print(f"  ! {f}")

    if dry_run:
        for p in candidates:
            print(f"  {p.posted_at[:10]} {p.source:<22} r/{p.subreddit}: {p.title[:90]}")
        return

    import classify
    import store

    new = [p for p in candidates if p.id not in store.existing_ids(p.id for p in candidates)]
    rows, saved, jobs = [], 0, 0
    for p in new:
        try:
            v = classify.classify(p)
        except Exception as e:
            print(f"  ! classify {p.id}: {e}")
            continue
        rows.append({**vars(p), **v.model_dump()})
        if v.is_job and v.category != "other":
            jobs += 1
            print(f"  + [{v.score}] {v.category}: {p.title[:90]}")
        if len(rows) == 20:  # save as we go so a timeout doesn't lose the run
            store.insert(rows)
            saved, rows = saved + len(rows), []
    store.insert(rows)
    saved += len(rows)
    print(f"classified {saved} new, {jobs} in-niche jobs, {time.time() - started:.0f}s")


REQUIRED_ENV = ("SUPABASE_URL", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY")


def load_dotenv(path=os.path.join(os.path.dirname(__file__), "..", ".env")):
    """Local runs read keys from .env; on GitHub Actions they come from repo secrets."""
    if not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        key, sep, value = line.strip().partition("=")
        if sep and not key.startswith("#") and value:
            os.environ.setdefault(key.strip(), value.strip())


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv()
    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    if missing and "--dry-run" not in sys.argv:
        print(f"missing {', '.join(missing)} - running as dry run")
    main("--dry-run" in sys.argv or bool(missing))
