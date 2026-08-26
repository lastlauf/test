import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SunToggle, TabBar } from "@/components/Chrome";
import { currentPlayer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Turkey Slice Invitational",
  description:
    "Live scoring, leaderboards, player records and side-bet ledger for the Annual Turkey Slice Invitational.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7c2d12",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await currentPlayer();
  return (
    <html lang="en">
      <body>
        <script
          // Apply the sunlight preference before paint so the screen never flashes.
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.sun=localStorage.getItem('tsi.sun')==='on'?'on':'off'}catch(e){}",
          }}
        />
        <header
          className="sticky top-0 z-40 flex items-center gap-3 border-b-2 px-4 py-2"
          style={{ background: "var(--tsi-shell)", borderColor: "var(--tsi-line)" }}
        >
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-base"
              style={{ background: "var(--color-turkey)", color: "#fff" }}
              aria-hidden
            >
              🦃
            </span>
            <span className="text-lg leading-none">
              TSI
              <span className="ml-2 hidden text-xs font-bold uppercase tracking-widest tsi-muted sm:inline">
                Turkey Slice Invitational
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <SunToggle />
            <Link
              href={player ? "/me" : "/login"}
              className="tsi-tap flex items-center rounded-xl border-2 px-3 text-sm font-extrabold"
              style={{ borderColor: "var(--tsi-line)" }}
            >
              {player ? player.username : "Sign in"}
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
