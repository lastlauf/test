"use client";

import { useState } from "react";
import { TurkeyMark } from "./TurkeyMark";

/**
 * The bird on the sign-in page.
 *
 * To use your own artwork instead of the drawn mark:
 *
 *   1. Put the file in public/ — public/turkey.jpg, say. Anything in public/
 *      is served from the site root, so that file is at /turkey.jpg.
 *   2. Point HERO_ARTWORK at it: "/turkey.jpg".
 *   3. Commit the file. It has to be in the repo — the deployment builds from
 *      the branch, not from anyone's laptop.
 *
 * Set it back to null for the drawn mark. A JPEG, PNG, WebP or SVG all work.
 * If the file is missing or won't decode the drawing takes over, so a typo in
 * the path costs you the artwork, not the page.
 */
const HERO_ARTWORK: string | null = null;

export function HeroTurkey({ size = 168 }: { size?: number }) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  if (!HERO_ARTWORK || artworkFailed) return <TurkeyMark size={size} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={HERO_ARTWORK}
      alt="The Turkey Slice Invitational bird"
      className="h-auto"
      style={{ width: size, maxWidth: "100%" }}
      onError={() => setArtworkFailed(true)}
    />
  );
}
