"""Phase 1: check candidate subreddits exist and contain relevant hiring posts.

Reads each subreddit's public RSS feed (one request at a time, paced),
then counts [Hiring] vs [For Hire] posts and keyword matches.
Usage: python scripts/validate_subreddits.py [sub1 sub2 ...]
"""
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

UA = "solomon-os-reddit-jobs/0.1"
ATOM = "{http://www.w3.org/2005/Atom}"
PAUSE_SECONDS = 8

CANDIDATES = [
    "forhire", "hiring", "jobbit", "freelance_forhire", "n8n", "n8n_ai_agents",
    "automation", "AiAutomations", "zapier", "GoogleAppsScript", "gsuite", "sales",
]

HIRING = re.compile(r"\[\s*(hiring|task)\s*\]|\b(we('| a)re|i'?m|i am) (looking for|hiring)\b|\bneed (someone|an? |help)\b|\blooking to hire\b", re.I)
FOR_HIRE = re.compile(r"\[\s*(for\s*hire|offer)\s*\]|\boffering my\b|\bmy services\b", re.I)
TOPIC = re.compile(r"\b(n8n|make\.com|zapier|automat\w*|ai agents?|apps ?script|google (workspace|sheets)|gtm|go[- ]to[- ]market|clay|outbound|crm)\b", re.I)


def fetch(sub, attempts=4):
    req = urllib.request.Request(f"https://www.reddit.com/r/{sub}/new/.rss?limit=100", headers={"User-Agent": UA})
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                return e.code, b""
            # Honour Reddit's own reset window before retrying
            wait = float(e.headers.get("x-ratelimit-reset") or 30) + 2
            time.sleep(max(wait, 15))
    return 429, b""


def entries(xml_bytes):
    root = ET.fromstring(xml_bytes)
    for e in root.findall(f"{ATOM}entry"):
        title = e.findtext(f"{ATOM}title") or ""
        body = re.sub(r"<[^>]+>", " ", e.findtext(f"{ATOM}content") or "")
        link = e.find(f"{ATOM}link").get("href")
        yield title, body, link, e.findtext(f"{ATOM}updated") or ""


def main(subs):
    for i, sub in enumerate(subs):
        if i:
            time.sleep(PAUSE_SECONDS)
        status, data = fetch(sub)
        if status != 200:
            print(f"r/{sub}: HTTP {status}")
            continue
        posts = list(entries(data))
        hits = [p for p in posts if HIRING.search(p[0] + " " + p[1]) and not FOR_HIRE.search(p[0])]
        relevant = [p for p in hits if TOPIC.search(p[0] + " " + p[1])]
        span = f"{posts[-1][3][:10]}..{posts[0][3][:10]}" if posts else "-"
        for_hire = sum(bool(FOR_HIRE.search(p[0])) for p in posts)
        print(f"r/{sub}: {len(posts)} posts ({span}) | for-hire {for_hire} | hiring {len(hits)} | relevant hiring {len(relevant)}")
        for title, _, link, _ in relevant[:5]:
            print(f"    + {title[:110]}\n      {link}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1:] or CANDIDATES)
