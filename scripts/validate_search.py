"""Phase 1b: test Reddit-wide search RSS feeds for hiring posts in our niches."""
import sys
import time
import urllib.parse

from validate_subreddits import FOR_HIRE, PAUSE_SECONDS, UA, entries
import urllib.error
import urllib.request

QUERIES = [
    'title:hiring (n8n OR zapier OR "make.com" OR "ai automation" OR "ai agent")',
    'title:hiring ("apps script" OR "google workspace" OR "google sheets")',
    'title:hiring (GTM OR "go to market" OR clay OR outbound OR "lead gen")',
    '"looking for" (n8n OR zapier OR "automation expert" OR "automation specialist")',
]


def fetch(url, attempts=4):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                return e.code, b""
            time.sleep(max(float(e.headers.get("x-ratelimit-reset") or 30) + 2, 15))
    return 429, b""


def main():
    for i, q in enumerate(QUERIES):
        if i:
            time.sleep(PAUSE_SECONDS)
        url = "https://www.reddit.com/search.rss?" + urllib.parse.urlencode({"q": q, "sort": "new", "t": "month", "limit": 100})
        status, data = fetch(url)
        if status != 200:
            print(f"{q}\n  HTTP {status}")
            continue
        posts = list(entries(data))
        kept = [p for p in posts if not FOR_HIRE.search(p[0])]
        print(f"{q}\n  {len(posts)} results, {len(kept)} after dropping [For Hire]")
        for title, _, link, updated in kept[:8]:
            sub = link.split("/r/")[1].split("/")[0]
            print(f"    {updated[:10]} r/{sub}: {title[:95]}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
