"""Re-run the classifier over every stored post, e.g. after the prompt or fields change.

Keeps each post's status (new/saved/applied/ignored). Usage: python agent/reclassify.py
"""
import sys

import classify
import run
import store
from reddit import Post

COLUMNS = "id,subreddit,title,body,url,author,posted_at,source"

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    run.load_dotenv()
    rows = store.all_rows(COLUMNS)
    print(f"reclassifying {len(rows)} posts")
    batch = []
    for i, r in enumerate(rows, 1):
        try:
            v = classify.classify(Post(**r))
        except Exception as e:
            print(f"  ! {r['id']}: {e}")
            continue
        batch.append({**r, **v.model_dump()})
        if len(batch) == 20 or i == len(rows):
            store.upsert(batch)
            print(f"  {i}/{len(rows)}")
            batch = []
    store.upsert(batch)
