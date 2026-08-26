import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { TabBar } from "@/components/Chrome";
import { LogoMark } from "@/components/TurkeyMark";
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
  themeColor: "#8a3312",
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
        <header
          className="tsi-rule-b sticky top-0 z-40 flex items-center gap-3 px-5 py-3"
          style={{ background: "var(--tsi-shell)" }}
        >
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="text-lg font-extrabold tracking-tight">TSI</span>
          </Link>
          <div className="ml-auto flex items-center">
            <Link
              href={player ? "/me" : "/login"}
              className="tsi-tap flex items-center px-2 text-[15px] font-semibold"
              style={{ color: "var(--tsi-muted)" }}
            >
              {player ? player.username : "Sign in"}
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-5 pb-32 pt-8">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
