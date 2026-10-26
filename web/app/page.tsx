import Link from "next/link";
import { Suspense } from "react";
import { logout } from "./actions";
import { JobCard } from "./job-card";
import { CATEGORY_LABEL, NICHES, listJobs, stats, type Category, type Job, type Status } from "@/lib/jobs";

function SetupError({ message }: { message: string }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-navy px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8">
        <h1 className="text-lg font-semibold">Can&apos;t load jobs</h1>
        <p className="mt-2 rounded-xl bg-amber-soft px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere]">{message}</p>
        <p className="mt-4 text-sm text-indigo">
          Fix it in Vercel → Settings → Environment Variables, then redeploy the latest deployment.
        </p>
      </div>
    </main>
  );
}

const CATEGORY_TABS: { key: string; label: string; categories: Category[] }[] = [
  { key: "niche", label: "My niches", categories: NICHES },
  { key: "ai_automation", label: CATEGORY_LABEL.ai_automation, categories: ["ai_automation"] },
  { key: "google_workspace", label: CATEGORY_LABEL.google_workspace, categories: ["google_workspace"] },
  { key: "gtm", label: CATEGORY_LABEL.gtm, categories: ["gtm"] },
  { key: "other", label: "Other jobs", categories: ["other"] },
];
const STATUS_TABS: { key: Status | "all"; label: string }[] = [
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "ignored", label: "Ignored" },
  { key: "all", label: "All" },
];
const MIN_SCORES = [0, 20, 40, 60];

type Params = { cat?: string; status?: string; min?: string; loc?: string };

function href(current: Params, change: Params) {
  const q = new URLSearchParams({ ...current, ...change } as Record<string, string>);
  return `/?${q}`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

function Loading() {
  return (
    <>
      <header className="h-56 bg-navy" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-3 px-4 py-6 sm:px-6" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-3xl bg-white" />
        ))}
      </main>
    </>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = (await searchParams) as Params;
  const params: Params = { cat: sp.cat ?? "niche", status: sp.status ?? "new", min: sp.min ?? "0", loc: sp.loc ?? "remote" };
  const remoteOnly = params.loc !== "any";
  const tab = CATEGORY_TABS.find((t) => t.key === params.cat) ?? CATEGORY_TABS[0];
  const status = (STATUS_TABS.find((t) => t.key === params.status) ?? STATUS_TABS[0]).key;
  const minScore = Number(params.min) || 0;

  let jobs: Job[], s: Awaited<ReturnType<typeof stats>>;
  try {
    [jobs, s] = await Promise.all([listJobs({ categories: tab.categories, status, minScore, remoteOnly }), stats()]);
  } catch (e) {
    // Only reachable after login, so it's fine to say what's wrong.
    return <SetupError message={(e as Error).message} />;
  }

  return (
    <>
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-6 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-white/10">
                <span className="size-3 rounded-full bg-amber" />
              </span>
              <div>
                <h1 className="text-xl font-semibold">Job Radar</h1>
                <p className="text-sm text-mist/80">Reddit hiring posts · AI automation · Google Workspace · GTM</p>
              </div>
            </div>
            <form action={logout}>
              <button className="rounded-full px-4 py-2 text-sm text-mist/80 transition hover:bg-white/10 hover:text-white">
                Log out
              </button>
            </form>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["New · remote worldwide", s.fresh],
              ["Found last 24h", s.today],
              ["Saved", s.saved],
              ["Applied", s.applied],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/[0.07] px-4 py-3">
                <dt className="text-xs text-mist/70">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-mist/60">Last scan {timeAgo(s.lastRun)} · checks Reddit every 30 minutes</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <nav aria-label="Category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {CATEGORY_TABS.map((t) => (
            <Link
              key={t.key}
              href={href(params, { cat: t.key })}
              aria-current={t.key === tab.key ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                t.key === tab.key ? "bg-navy text-white" : "bg-white text-indigo hover:bg-indigo-soft"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Status" className="flex rounded-full bg-white p-1">
            {STATUS_TABS.map((t) => (
              <Link
                key={t.key}
                href={href(params, { status: t.key })}
                aria-current={t.key === status ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  t.key === status ? "bg-amber font-semibold text-navy" : "text-indigo hover:text-navy"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Location" className="flex rounded-full bg-white p-1 text-sm">
            {[
              ["remote", "Remote · worldwide"],
              ["any", "Any location"],
            ].map(([key, label]) => (
              <Link
                key={key}
                href={href(params, { loc: key })}
                aria-current={(key === "remote") === remoteOnly ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 transition ${
                  (key === "remote") === remoteOnly ? "bg-navy font-medium text-white" : "text-indigo hover:text-navy"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Minimum fit score" className="flex items-center gap-1 text-sm text-indigo">
            <span className="mr-1">Min fit</span>
            {MIN_SCORES.map((m) => (
              <Link
                key={m}
                href={href(params, { min: String(m) })}
                className={`rounded-full px-3 py-1.5 tabular-nums transition ${
                  m === minScore ? "bg-indigo text-white" : "hover:bg-white"
                }`}
              >
                {m === 0 ? "Any" : `${m}+`}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-5 text-sm text-indigo">
          {jobs.length} {jobs.length === 1 ? "post" : "posts"}
          {jobs.length === 150 && " (showing newest 150)"}
        </p>

        {jobs.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-mist bg-white px-6 py-14 text-center">
            <p className="font-medium">Nothing here yet</p>
            <p className="mt-1 text-sm text-indigo">
              New posts land every 30 minutes. Try another tab or lower the minimum fit.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
