import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TabBar } from "@/components/Chrome";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/*
         * No header bar. The tab bar names where you are, every page opens with
         * its own title, and the one thing a header carried that the tabs don't
         * — your account — sits on the home page instead.
         */}
        <main
          className="mx-auto w-full max-w-3xl px-5 pb-32"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
        >
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
