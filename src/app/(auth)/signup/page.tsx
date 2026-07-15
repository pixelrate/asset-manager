"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "@/lib/auth-actions";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, {});
  const [mode, setMode] = useState<"new" | "invite">("new");

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-gray-900">Create your account</h1>
      <p className="mb-5 text-sm text-gray-500">
        New accounts are reviewed by an administrator before activation.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`rounded-md px-3 py-1.5 ${mode === "new" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
        >
          New workspace
        </button>
        <button
          type="button"
          onClick={() => setMode("invite")}
          className={`rounded-md px-3 py-1.5 ${mode === "invite" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
        >
          I have an invite
        </button>
      </div>

      <ErrorBanner message={state.error} />
      <form action={action} className="space-y-4">
        <Field label="Your name">
          <Input name="name" required placeholder="Jesse Smith" autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        {mode === "new" ? (
          <Field label="Workspace name" hint="Your household or shop — items, locations, and users live here.">
            <Input name="tenantName" placeholder="Jesse’s Garage" />
          </Field>
        ) : (
          <Field label="Invite code" hint="Joins an existing workspace immediately — no approval needed.">
            <Input name="inviteCode" placeholder="e.g. 8f3kq2…" />
          </Field>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
