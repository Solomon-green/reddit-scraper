"""What the agent watches and how it pre-filters posts."""
import re

USER_AGENT = "solomon-os-reddit-jobs/0.1"

# Job boards where clients post [Hiring]/[Task] — read their full "new" feed.
# Verified 2026-10-26: each exists and carries real hiring posts.
JOB_BOARDS = [
    "forhire", "hiring", "jobbit", "RemoteJobs", "slavelabour", "DoneDirtCheap",
    "Programmers_forhire", "ForHireFreelance", "freelances_forhire",
]

# Reddit-wide searches (sorted by new) to catch hiring posts anywhere,
# including tool communities like r/n8n where full feeds are mostly help requests.
SEARCHES = [
    'title:hiring (n8n OR zapier OR "make.com" OR automation OR "ai agent" OR "apps script" OR "google workspace" OR "google sheets")',
    'title:hiring (GTM OR "go to market" OR clay OR outbound OR "lead gen")',
    'subreddit:n8n OR subreddit:zapier OR subreddit:automation OR subreddit:GoogleAppsScript OR subreddit:n8n_ai_agents',
]

# Someone wants to pay for work — required before a post reaches the AI.
HIRING = re.compile(
    r"\[\s*(hiring|task|hire|job|paid)\s*\]|\bhiring\b|\bwe('| a)re looking for\b|\blooking for (a|an|someone|somebody)\b"
    r"|\bneed (a|an|someone|somebody)\b|\b(want|looking) to hire\b|\bseeking (a|an)\b|\bwill pay\b|\bpaid (gig|project|work)\b"
    r"|\bbudget\b|\$\d",
    re.I,
)

# Freelancers advertising themselves — always dropped before the AI step.
FOR_HIRE = re.compile(
    r"\[\s*(for\s*hire|offer|offering|available)\s*\]|\bfor hire\b|\boffering my\b|\bmy services\b"
    r"|\bhire me\b|\bi('| a)m available\b|\bopen (to|for) (work|projects)\b",
    re.I,
)

# The post has to touch at least one of Solomon's niches to be worth classifying.
TOPIC = re.compile(
    r"\b(n8n|make\.com|zapier|automat\w*|ai agents?|agentic|workflows?|apps ?script|appsheet"
    r"|google (workspace|sheets|docs|forms)|g ?suite|gtm|go[- ]to[- ]market|clay|outbound|lead gen\w*"
    r"|crm|hubspot|gohighlevel|airtable|notion|integrations?|api)\b",
    re.I,
)

CATEGORIES = ["ai_automation", "google_workspace", "gtm", "other"]
