"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/auth-actions";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-gray-900">Sign in</h1>
      <p className="mb-5 text-sm text-gray-500">Welcome back. Grab your label maker.</p>
      <ErrorBanner message={state.error} />
      <form action={action} className="space-y-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">
        No account?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
