"""Read Reddit's public RSS feeds, one request at a time, within its rate limit."""
import html
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass

from config import USER_AGENT

ATOM = "{http://www.w3.org/2005/Atom}"
MIN_GAP_SECONDS = 4
_last_request = 0.0


@dataclass
class Post:
    id: str
    subreddit: str
    title: str
    body: str
    url: str
    author: str
    posted_at: str
    source: str


def _get(url, attempts=4):
    global _last_request
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for _ in range(attempts):
        time.sleep(max(0, _last_request + MIN_GAP_SECONDS - time.time()))
        _last_request = time.time()
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            # Honour Reddit's own reset window before retrying
            time.sleep(float(e.headers.get("x-ratelimit-reset") or 30) + 1)
    raise RuntimeError(f"rate limited: {url}")


def _parse(xml_bytes, source):
    root = ET.fromstring(xml_bytes)
    for e in root.findall(f"{ATOM}entry"):
        link = e.find(f"{ATOM}link").get("href")
        if "/comments/" not in link:
            continue  # search results can include subreddits, not just posts
        body = html.unescape(re.sub(r"<[^>]+>", " ", e.findtext(f"{ATOM}content") or ""))
        body = re.sub(r"\s+", " ", body).replace("submitted by /u/", "").strip()
        yield Post(
            id=e.findtext(f"{ATOM}id"),
            subreddit=link.split("/r/")[1].split("/")[0],
            title=html.unescape(e.findtext(f"{ATOM}title") or ""),
            body=body[:4000],
            url=link,
            author=(e.findtext(f"{ATOM}author/{ATOM}name") or "").removeprefix("/u/"),
            posted_at=e.findtext(f"{ATOM}published") or e.findtext(f"{ATOM}updated"),
            source=source,
        )


def subreddit_new(sub):
    return list(_parse(_get(f"https://www.reddit.com/r/{sub}/new/.rss?limit=100"), f"r/{sub}"))


def search(query):
    qs = urllib.parse.urlencode({"q": query, "sort": "new", "t": "week", "type": "link", "limit": 100})
    return list(_parse(_get(f"https://www.reddit.com/search.rss?{qs}"), "search"))
