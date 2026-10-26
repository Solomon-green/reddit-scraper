"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession, sessionToken } from "@/lib/auth";
import { STATUSES, updateStatus, type Status } from "@/lib/jobs";

export async function setStatus(formData: FormData) {
  // Server Functions are reachable by POST directly, so re-check the session here too.
  if (!isValidSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/login");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as Status;
  if (!STATUSES.includes(status)) throw new Error("bad status");
  await updateStatus(id, status);
  revalidatePath("/");
}

export async function login(_: string | null, formData: FormData) {
  if (String(formData.get("password")) !== process.env.DASHBOARD_PASSWORD) return "Wrong password";
  (await cookies()).set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
