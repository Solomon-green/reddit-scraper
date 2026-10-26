"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex flex-1 items-center justify-center bg-navy px-4">
      <form action={action} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl shadow-navy-deep/40">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-navy">
            <span className="size-3 rounded-full bg-amber" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Job Radar</h1>
            <p className="text-sm text-indigo">Reddit hiring posts, filtered for you</p>
          </div>
        </div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="w-full rounded-xl border border-mist px-4 py-3 outline-none focus:border-indigo"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          disabled={pending}
          className="mt-5 w-full rounded-full bg-amber py-3 font-semibold text-navy transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Open dashboard"}
        </button>
      </form>
    </main>
  );
}
