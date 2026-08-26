"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export interface CourseFormValues {
  name: string;
  city: string;
  state: string;
  yardage: string;
  slope: string;
  rating: string;
}

const BLANK: CourseFormValues = {
  name: "",
  city: "",
  state: "",
  yardage: "",
  slope: "113",
  rating: "72.0",
};

/**
 * Add or edit a course. Slope and rating are not decoration — every course
 * handicap in the app is computed from them — so they are required and checked
 * on the server as well as here.
 */
export function CourseForm({
  courseId,
  initial,
}: {
  courseId?: string;
  initial?: Partial<CourseFormValues>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CourseFormValues>({ ...BLANK, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set =
    (key: keyof CourseFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        courseId ? `/api/courses/${courseId}` : "/api/courses",
        {
          method: courseId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const body = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(body.error ?? "That didn't save.");
        setBusy(false);
        return;
      }
      router.push(`/courses/${body.id ?? courseId}`);
      router.refresh();
    } catch {
      setError("No connection. Check your signal and try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="tsi-label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          className="tsi-field"
          value={form.name}
          onChange={set("name")}
          placeholder="Bandon Dunes"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="tsi-label" htmlFor="city">
            Town
          </label>
          <input id="city" className="tsi-field" value={form.city} onChange={set("city")} />
        </div>
        <div>
          <label className="tsi-label" htmlFor="state">
            State
          </label>
          <input
            id="state"
            className="tsi-field"
            value={form.state}
            onChange={set("state")}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="tsi-label" htmlFor="yardage">
            Yards
          </label>
          <input
            id="yardage"
            className="tsi-field tsi-num"
            inputMode="numeric"
            value={form.yardage}
            onChange={set("yardage")}
          />
        </div>
        <div>
          <label className="tsi-label" htmlFor="slope">
            Slope
          </label>
          <input
            id="slope"
            className="tsi-field tsi-num"
            inputMode="numeric"
            value={form.slope}
            onChange={set("slope")}
          />
        </div>
        <div>
          <label className="tsi-label" htmlFor="rating">
            Rating
          </label>
          <input
            id="rating"
            className="tsi-field tsi-num"
            inputMode="decimal"
            value={form.rating}
            onChange={set("rating")}
          />
        </div>
      </div>

      <p className="text-[14px] tsi-muted">
        Slope and rating set everyone&apos;s course handicap here, so they are worth
        getting off the card rather than guessing. A new course starts with a standard
        par-72 hole layout you can play straight away.
      </p>

      {error && (
        <p
          className="rounded-xl tsi-rule px-3 py-2 text-[14px] font-semibold"
          role="alert"
          style={{ borderColor: "var(--color-flag)", color: "var(--color-flag)" }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="tsi-btn tsi-btn-primary flex-1"
          disabled={busy}
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Saving…" : courseId ? "Save course" : "Add course"}
        </button>
        <Link href={courseId ? `/courses/${courseId}` : "/courses"} className="tsi-btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
