"""Ask Claude whether a post is a real client job in Solomon's niches."""
from typing import Literal

import anthropic
import pydantic

MODEL = "claude-haiku-5-5"

SYSTEM = """You screen Reddit posts for a freelance consultant who sells:
- AI automation (n8n, Make, Zapier, AI agents, workflow automation, integrations)
- Google Workspace (Apps Script, Sheets, Docs, Forms, AppSheet, Workspace admin/setup)
- GTM / go-to-market engineering (Clay, outbound systems, lead gen pipelines, CRM ops)

is_job: true if the post is someone WHO WANTS TO PAY for work (a client, employer or company
hiring a freelancer, contractor or employee) in any field.
false for: freelancers or agencies advertising their own services, job seekers, people asking
for free help or advice, tool launches, tutorials, showcases ("I built..."), surveys.

category: which of the consultant's niches the work falls in; "other" if none
(e.g. generic sales, appointment setting, customer support, sysadmin, web development).

score: 0-100 fit for this consultant (100 = clearly paid, clearly in-niche, clear scope;
under 20 for anything in "other").
budget: the stated pay/budget verbatim, or "" if none.
summary: one plain sentence describing what they need.
reason: one short sentence (under 25 words) explaining the verdict."""


class Verdict(pydantic.BaseModel):
    is_job: bool
    category: Literal["ai_automation", "google_workspace", "gtm", "other"]
    score: int
    budget: str
    summary: str
    reason: str


_client = None


def classify(post):
    global _client
    _client = _client or anthropic.Anthropic()
    msg = _client.messages.parse(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": f"Subreddit: r/{post.subreddit}\nTitle: {post.title}\n\n{post.body}"}],
        output_format=Verdict,
    )
    if msg.parsed_output is None:
        raise ValueError(f"no verdict (stop_reason={msg.stop_reason})")
    return msg.parsed_output
