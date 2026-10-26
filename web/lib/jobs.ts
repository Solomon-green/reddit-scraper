import "server-only";

// Supabase REST (PostgREST) with the secret key — server-side only; the table has
// RLS on and no public policies, so the browser never talks to Supabase directly.

export type Category = "ai_automation" | "google_workspace" | "gtm" | "other";
export type Status = "new" | "saved" | "applied" | "ignored";
export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: "Location unclear",
};

export type Job = {
  id: string;
  subreddit: string;
  title: string;
  url: string;
  author: string;
  posted_at: string;
  found_at: string;
  category: Category;
  score: number;
  work_mode: WorkMode;
  remote_region: string;
  budget: string;
  summary: string;
  reason: string;
  status: Status;
};

export const NICHES: Category[] = ["ai_automation", "google_workspace", "gtm"];
export const STATUSES: Status[] = ["new", "saved", "applied", "ignored"];

export const CATEGORY_LABEL: Record<Category, string> = {
  ai_automation: "AI Automation",
  google_workspace: "Google Workspace",
  gtm: "GTM",
  other: "Other",
};

// Problems an admin can fix in Vercel settings; safe to show (never includes the key itself).
export class ConfigError extends Error {}

function supabaseUrl() {
  const raw = process.env.SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
  if (!raw) throw new ConfigError("SUPABASE_URL is not set in Vercel environment variables.");
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co/.test(raw))
    throw new ConfigError(`SUPABASE_URL should look like https://<project>.supabase.co — got "${raw.slice(0, 60)}".`);
  return raw.replace(/\/(rest\/v1)?\/?$/, "");
}

function secretKey() {
  const key = process.env.SUPABASE_SECRET_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key) throw new ConfigError("SUPABASE_SECRET_KEY is not set in Vercel environment variables.");
  if (key.startsWith("sb_publishable_"))
    throw new ConfigError("SUPABASE_SECRET_KEY is the publishable key — use the secret key (sb_secret_...).");
  return key;
}

async function rest(path: string, init: RequestInit = {}) {
  const url = `${supabaseUrl()}/rest/v1/${path}`;
  const key = secretKey();
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { apikey: key, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch (e) {
    throw new ConfigError(`Could not reach Supabase at ${supabaseUrl()} (${(e as Error).message}). Is the project paused?`);
  }
  if (res.status === 401 || res.status === 403)
    throw new ConfigError(`Supabase rejected SUPABASE_SECRET_KEY (HTTP ${res.status}). Re-copy the secret key from Supabase.`);
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res;
}

export type Filters = { categories: Category[]; status: Status | "all"; minScore: number; remoteOnly: boolean };

// Bot boards reposting corporate job-site ads; the agent no longer collects them (agent/config.py).
const MUTED_SUBREDDITS = "not.in.(jobboardsearch,HiddenJobsDev,RemoteJobIntel,RedditJobBoard)";

function filterQuery({ categories, status, minScore, remoteOnly }: Filters) {
  const q = new URLSearchParams({
    is_job: "eq.true",
    category: `in.(${categories.join(",")})`,
    subreddit: MUTED_SUBREDDITS,
  });
  // Fully remote AND open worldwide (no country/region/timezone limit)
  if (remoteOnly) {
    q.set("work_mode", "eq.remote");
    q.set("remote_region", "eq.");
  }
  if (status !== "all") q.set("status", `eq.${status}`);
  if (minScore > 0) q.set("score", `gte.${minScore}`);
  return q;
}

export async function listJobs(filters: Filters): Promise<Job[]> {
  const q = filterQuery(filters);
  q.set("select", "id,subreddit,title,url,author,posted_at,found_at,category,score,work_mode,remote_region,budget,summary,reason,status");
  q.set("order", "posted_at.desc");
  q.set("limit", "150");
  return (await rest(`reddit_jobs?${q}`)).json();
}

async function count(q: URLSearchParams) {
  q.set("select", "id");
  const res = await rest(`reddit_jobs?${q}`, { method: "HEAD", headers: { Prefer: "count=exact" } });
  return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
}

export async function stats() {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const openRemote = {
    is_job: "eq.true",
    category: `in.(${NICHES.join(",")})`,
    work_mode: "eq.remote",
    remote_region: "eq.",
    subreddit: MUTED_SUBREDDITS,
  };
  const [today, fresh, saved, applied, lastRun] = await Promise.all([
    count(new URLSearchParams({ ...openRemote, found_at: `gte.${since}` })),
    count(new URLSearchParams({ ...openRemote, status: "eq.new" })),
    count(new URLSearchParams({ status: "eq.saved" })),
    count(new URLSearchParams({ status: "eq.applied" })),
    rest("reddit_jobs?select=found_at&order=found_at.desc&limit=1").then((r) => r.json()),
  ]);
  return { today, fresh, saved, applied, lastRun: (lastRun[0]?.found_at as string | undefined) ?? null };
}

export async function updateStatus(id: string, status: Status) {
  await rest(`reddit_jobs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  });
}
