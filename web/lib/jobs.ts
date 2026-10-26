import "server-only";

// Supabase REST (PostgREST) with the secret key — server-side only; the table has
// RLS on and no public policies, so the browser never talks to Supabase directly.

export type Category = "ai_automation" | "google_workspace" | "gtm" | "other";
export type Status = "new" | "saved" | "applied" | "ignored";

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

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY ?? "",
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res;
}

export type Filters = { categories: Category[]; status: Status | "all"; minScore: number };

function filterQuery({ categories, status, minScore }: Filters) {
  const q = new URLSearchParams({ is_job: "eq.true", category: `in.(${categories.join(",")})` });
  if (status !== "all") q.set("status", `eq.${status}`);
  if (minScore > 0) q.set("score", `gte.${minScore}`);
  return q;
}

export async function listJobs(filters: Filters): Promise<Job[]> {
  const q = filterQuery(filters);
  q.set("select", "id,subreddit,title,url,author,posted_at,found_at,category,score,budget,summary,reason,status");
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
  const niche = `in.(${NICHES.join(",")})`;
  const [today, fresh, saved, applied, lastRun] = await Promise.all([
    count(new URLSearchParams({ is_job: "eq.true", category: niche, found_at: `gte.${since}` })),
    count(new URLSearchParams({ is_job: "eq.true", category: niche, status: "eq.new" })),
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
