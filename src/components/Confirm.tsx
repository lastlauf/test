"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A destructive action that asks first, inline. Two taps rather than a browser
 * dialog: the question stays in the layout, reads on a phone, and the answer
 * is a real button rather than a native prompt nobody trusts.
 */
export function ConfirmAction({
  label,
  question,
  confirmLabel,
  busyLabel,
  onConfirm,
  tone = "default",
  className = "",
  disabled,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  busyLabel: string;
  onConfirm: () => Promise<unknown>;
  tone?: "default" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (asking) confirmRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button
        type="button"
        className={`tsi-btn ${className}`}
        disabled={disabled}
        onClick={() => setAsking(true)}
        style={tone === "danger" ? { color: "var(--color-flag)" } : undefined}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="tsi-rule w-full rounded-xl p-4" role="alertdialog" aria-label={question}>
      <p className="text-[15px] font-semibold">{question}</p>
      <div className="mt-4 flex gap-3">
        <button
          ref={confirmRef}
          type="button"
          className="tsi-btn tsi-btn-primary flex-1"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setAsking(false);
            }
          }}
          style={
            tone === "danger"
              ? { background: "var(--color-flag)", borderColor: "var(--color-flag)" }
              : undefined
          }
        >
          {busy ? busyLabel : confirmLabel}
        </button>
        <button
          type="button"
          className="tsi-btn"
          disabled={busy}
          onClick={() => setAsking(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
