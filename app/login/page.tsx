"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5">
      <div className="max-w-sm w-full rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm opacity-70 mb-5">
          Authenticate to upload documents and generate briefs.
        </p>
        <button
          onClick={() => {
            try {
              const url = new URL(window.location.href);
              const appRedirect = url.searchParams.get("app_redirect") || undefined;
              const callbackUrl = "/mobile-auth-complete" + (appRedirect ? `?app_redirect=${encodeURIComponent(appRedirect)}` : "");
              signIn("google", { callbackUrl });
            } catch {
              signIn("google", { callbackUrl: "/" });
            }
          }}
          className="btn-primary text-sm w-full"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
