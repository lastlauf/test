"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A horizontal scroller that says so. Wide content — scorecards, record-book
 * tables, pill rows — scrolls inside itself rather than pushing the page
 * sideways, which leaves nothing on screen to suggest there is more of it. This
 * fades the content out against the background on whichever side is cut off,
 * and only on that side: no fade when everything already fits, one fade at the
 * far end when you are at the start, and one at each end in the middle.
 *
 * The fades are painted by the frame, not the scrolling element, so a panel's
 * border and corners stay crisp while the content underneath them softens.
 */
export function Scroller({
  children,
  className = "",
  innerClassName = "",
  ariaLabel,
  as: Frame = "div",
}: {
  children: ReactNode;
  /** Classes for the frame — where a border, padding or panel styling belongs. */
  className?: string;
  /** Classes for the element that actually scrolls. */
  innerClassName?: string;
  ariaLabel?: string;
  as?: "div" | "nav";
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    // A sub-pixel remainder is not something anyone needs told about.
    if (overflow <= 1) {
      setEdges((prev) => (prev.start || prev.end ? { start: false, end: false } : prev));
      return;
    }
    const next = {
      start: el.scrollLeft > 1,
      end: el.scrollLeft < overflow - 1,
    };
    setEdges((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  }, []);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });

    // The content can change width without the scroller doing so — a filtered
    // table, a font landing late — so watch both boxes.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);

    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, children]);

  return (
    <Frame
      className={`tsi-fade ${className}`}
      data-fade-start={edges.start ? "true" : undefined}
      data-fade-end={edges.end ? "true" : undefined}
      aria-label={ariaLabel}
    >
      <div ref={inner} className={`tsi-scroll ${innerClassName}`}>
        {children}
      </div>
    </Frame>
  );
}
