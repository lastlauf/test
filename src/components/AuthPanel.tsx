"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TurkeyMark } from "./TurkeyMark";

type Mode = "signin" | "create";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}

export default function AuthPanel({
  initialMode,
  googleEnabled,
}: {
  initialMode: Mode;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({
    identifier: "",
    displayName: "",
    email: "",
    password: "",
    handicapIndex: "18.0",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    // Keep the address bar honest without a round trip.
    window.history.replaceState(null, "", next === "signin" ? "/login" : "/register");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "signin"
        ? { identifier: form.identifier, password: form.password }
        : {
            displayName: form.displayName,
            email: form.email,
            password: form.password,
            handicapIndex: Number(form.handicapIndex),
          };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "That didn't work. Try again.");
        setBusy(false);
        return;
      }
      router.push(mode === "signin" ? "/" : "/me");
      router.refresh();
    } catch {
      setError("No connection. Check your signal and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Hero */}
      <div className="tsi-enter mb-6 text-center">
        <div className="mb-1 flex justify-center">
          <TurkeyMark size={132} />
        </div>
        <h1 className="text-[26px] font-extrabold leading-tight">
          Turkey Slice Invitational
        </h1>
        <p
          className="mx-auto mt-3 max-w-[19rem] text-[15px] font-semibold"
          style={{ color: "var(--tsi-accent)" }}
        >
          Lock the clubhouse — John&apos;s about to commit fowl play.
        </p>
        <p className="mx-auto mt-1 max-w-[19rem] text-[13px] tsi-muted">
          Three birdies in a row is a turkey. Three of your paychecks is just John.
        </p>
      </div>

      {/* Card */}
      <section className="tsi-enter tsi-panel p-4" style={{ ["--i" as string]: 1 }}>
        <div
          className="relative mb-4 grid grid-cols-2 rounded-xl tsi-rule p-1"
                  >
          <span
            aria-hidden
            className="tsi-segment-thumb absolute inset-y-1 left-1 rounded-lg"
            style={{
              width: "calc(50% - 0.25rem)",
              background: "var(--tsi-text)",
              transform: mode === "create" ? "translateX(100%)" : "translateX(0)",
            }}
          />
          {(["signin", "create"] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => switchTo(option)}
              aria-pressed={mode === option}
              className="tsi-tap relative z-10 rounded-lg text-[14px] font-semibold"
              style={{
              color: mode === option ? "var(--tsi-shell)" : "var(--tsi-text)",
              fontWeight: mode === option ? 700 : 500,
            }}
            >
              {option === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {googleEnabled ? (
          <a href="/api/auth/google" className="tsi-btn w-full">
            <GoogleGlyph />
            Continue with Google
          </a>
        ) : (
          <div>
            <button type="button" className="tsi-btn w-full" disabled style={{ opacity: 0.45 }}>
              <GoogleGlyph />
              Continue with Google
            </button>
            <p className="mt-2 text-center text-[13px] tsi-muted">
              Google sign-in isn&apos;t switched on for this deployment yet.
            </p>
          </div>
        )}

        <div className="my-4 flex items-center gap-3" aria-hidden>
          <span className="tsi-rule-t flex-1" />
          <span className="text-[12px] font-medium tsi-muted">or</span>
          <span className="tsi-rule-t flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signin" ? (
            <div>
              <label className="tsi-label" htmlFor="identifier">
                Email or username
              </label>
              <input
                id="identifier"
                className="tsi-field"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="username"
                placeholder="you@example.com"
                value={form.identifier}
                onChange={set("identifier")}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="tsi-label" htmlFor="displayName">
                  Name
                </label>
                <input
                  id="displayName"
                  className="tsi-field"
                  autoComplete="name"
                  placeholder="Dave Marchetti"
                  value={form.displayName}
                  onChange={set("displayName")}
                />
              </div>
              <div>
                <label className="tsi-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="tsi-field"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>
            </>
          )}

          <div>
            <label className="tsi-label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                className="tsi-field pr-16"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "create" ? "At least 8 characters" : ""}
                value={form.password}
                onChange={set("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-3 text-[13px] font-semibold"
                style={{ minHeight: 44, color: "var(--tsi-muted)" }}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {mode === "create" && (
            <div>
              <label className="tsi-label" htmlFor="handicapIndex">
                Handicap index
              </label>
              <input
                id="handicapIndex"
                className="tsi-field tsi-num"
                inputMode="decimal"
                value={form.handicapIndex}
                onChange={set("handicapIndex")}
              />
              <p className="mt-1.5 text-[13px] tsi-muted">
                A guess is fine — you can fix it on your profile later.
              </p>
            </div>
          )}

          {error && (
            <p
              className="rounded-xl tsi-rule px-3 py-2 text-[14px] font-semibold"
              role="alert"
              style={{ borderColor: "var(--color-flag)", color: "var(--color-flag)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="tsi-btn tsi-btn-primary w-full text-base"
            disabled={busy}
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy
              ? mode === "signin"
                ? "Signing in…"
                : "Creating…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </section>

      <p
        className="tsi-enter mt-4 text-center text-[13px] tsi-muted"
        style={{ ["--i" as string]: 2 }}
      >
        Scores and side bets you post are visible to everyone in the tournament.
      </p>
    </div>
  );
}
