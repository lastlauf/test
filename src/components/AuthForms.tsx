"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "./ui";

function GoogleButton() {
  return (
    <a href="/api/auth/google" className="tsi-btn w-full">
      <span aria-hidden>G</span> Continue with Google
    </a>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "Could not sign in");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <Panel className="space-y-3">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="tsi-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="tsi-field"
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div>
          <label className="tsi-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="tsi-field"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && (
          <p className="font-bold" style={{ color: "var(--color-flag)" }}>
            {error}
          </p>
        )}
        <button type="submit" className="tsi-btn tsi-btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {googleEnabled && <GoogleButton />}
      <p className="text-center font-semibold">
        New here?{" "}
        <Link href="/register" className="underline">
          Create a username
        </Link>
      </p>
    </Panel>
  );
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    handicapIndex: "18.0",
    ghin: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        handicapIndex: Number(form.handicapIndex),
      }),
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "Could not create that account");
      return;
    }
    router.push("/me");
    router.refresh();
  };

  return (
    <Panel className="space-y-3">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="tsi-label" htmlFor="new-username">
            Username
          </label>
          <input
            id="new-username"
            className="tsi-field"
            autoCapitalize="none"
            value={form.username}
            onChange={set("username")}
          />
        </div>
        <div>
          <label className="tsi-label" htmlFor="display">
            Full name
          </label>
          <input id="display" className="tsi-field" value={form.displayName} onChange={set("displayName")} />
        </div>
        <div>
          <label className="tsi-label" htmlFor="new-password">
            Password
          </label>
          <input
            id="new-password"
            type="password"
            className="tsi-field"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="tsi-label" htmlFor="index">
              Handicap index
            </label>
            <input
              id="index"
              className="tsi-field tsi-num"
              inputMode="decimal"
              value={form.handicapIndex}
              onChange={set("handicapIndex")}
            />
          </div>
          <div>
            <label className="tsi-label" htmlFor="ghin">
              GHIN (optional)
            </label>
            <input id="ghin" className="tsi-field tsi-num" inputMode="numeric" value={form.ghin} onChange={set("ghin")} />
          </div>
        </div>
        {error && (
          <p className="font-bold" style={{ color: "var(--color-flag)" }}>
            {error}
          </p>
        )}
        <button type="submit" className="tsi-btn tsi-btn-primary w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      {googleEnabled && <GoogleButton />}
      <p className="text-center font-semibold">
        Already have one?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </Panel>
  );
}
