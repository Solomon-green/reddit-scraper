import { setStatus } from "./actions";
import { CATEGORY_LABEL, WORK_MODE_LABEL, type Job, type Status } from "@/lib/jobs";

const ACTIONS: { status: Status; label: string }[] = [
  { status: "saved", label: "Save" },
  { status: "applied", label: "Applied" },
  { status: "ignored", label: "Ignore" },
];

function scoreTone(score: number) {
  if (score >= 60) return "bg-amber text-navy";
  if (score >= 30) return "bg-indigo text-white";
  return "bg-mist text-indigo";
}

function posted(iso: string) {
  const d = new Date(iso);
  const hours = (Date.now() - d.getTime()) / 3.6e6;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function JobCard({ job }: { job: Job }) {
  return (
    <li className="rounded-3xl bg-white p-5 shadow-sm shadow-navy/5 ring-1 ring-mist/60">
      <div className="flex gap-4">
        <div
          className={`grid size-12 shrink-0 place-items-center rounded-2xl text-base font-semibold tabular-nums ${scoreTone(job.score)}`}
          title="Fit score (0–100)"
        >
          {job.score}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo">
            <span className="rounded-full bg-indigo-soft px-2.5 py-0.5 font-medium text-navy">
              {CATEGORY_LABEL[job.category]}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-medium ${
                job.work_mode === "remote" ? "bg-amber-soft text-navy" : "bg-mist/60 text-indigo"
              }`}
            >
              {WORK_MODE_LABEL[job.work_mode]}
              {job.remote_region && ` · ${job.remote_region}`}
            </span>
            <span>r/{job.subreddit}</span>
            <span aria-hidden>·</span>
            <span>{posted(job.posted_at)}</span>
            {job.author && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">u/{job.author}</span>
              </>
            )}
          </div>
          <h2 className="mt-1.5 font-semibold leading-snug [overflow-wrap:anywhere]">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {job.title}
            </a>
          </h2>
          {job.summary && <p className="mt-1 text-sm leading-relaxed text-indigo">{job.summary}</p>}
          {job.budget && (
            <p className="mt-2 inline-block rounded-xl bg-amber-soft px-3 py-1 text-xs font-medium leading-relaxed text-navy">
              {job.budget}
            </p>
          )}
          {job.reason && (
            <details className="mt-2 text-xs text-indigo">
              <summary className="cursor-pointer select-none hover:text-navy">Why this score</summary>
              <p className="mt-1 leading-relaxed">{job.reason}</p>
            </details>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-deep"
            >
              Open on Reddit
            </a>
            {ACTIONS.filter((a) => a.status !== job.status).map((a) => (
              <form key={a.status} action={setStatus}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="status" value={a.status} />
                <button className="rounded-full px-4 py-2 text-sm font-medium text-indigo ring-1 ring-mist transition hover:bg-indigo-soft hover:text-navy">
                  {a.label}
                </button>
              </form>
            ))}
            {job.status !== "new" && (
              <form action={setStatus}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="status" value="new" />
                <button className="rounded-full px-3 py-2 text-sm text-indigo/70 transition hover:text-navy">
                  Move to New
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
