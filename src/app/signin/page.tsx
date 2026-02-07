"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
      <p className="text-sm text-zinc-500">Use any connected social provider.</p>

      <button onClick={() => signIn("google", { callbackUrl: "/" })} className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm">
        Continue with Google
      </button>
      <button onClick={() => signIn("github", { callbackUrl: "/" })} className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm">
        Continue with GitHub
      </button>
      <button onClick={() => signIn("discord", { callbackUrl: "/" })} className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm">
        Continue with Discord
      </button>
    </main>
  );
}
