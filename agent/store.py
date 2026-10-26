"""Supabase REST (PostgREST) access for the reddit_jobs table."""
import json
import os
import urllib.parse
import urllib.request

TABLE = "reddit_jobs"


def _request(method, path, body=None, prefer=None):
    headers = {"apikey": os.environ["SUPABASE_SECRET_KEY"], "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(
        f"{os.environ['SUPABASE_URL']}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def existing_ids(ids):
    """Return the subset of post ids already stored, so they aren't re-classified."""
    found = set()
    ids = list(ids)
    for i in range(0, len(ids), 100):
        chunk = ",".join(f'"{x}"' for x in ids[i:i + 100])
        rows = _request("GET", f"{TABLE}?select=id&id=in.({urllib.parse.quote(chunk)})")
        found.update(r["id"] for r in rows)
    return found


def insert(rows):
    if rows:
        _request("POST", f"{TABLE}?on_conflict=id", rows, prefer="resolution=ignore-duplicates,return=minimal")


def upsert(rows):
    """Overwrite the given columns of existing rows (status is left alone if not included)."""
    if rows:
        _request("POST", f"{TABLE}?on_conflict=id", rows, prefer="resolution=merge-duplicates,return=minimal")


def all_rows(columns):
    rows, offset = [], 0
    while True:
        page = _request("GET", f"{TABLE}?select={columns}&order=id&limit=500&offset={offset}")
        rows += page
        if len(page) < 500:
            return rows
        offset += 500
