"use client";

import type { Session } from "next-auth";

export function AppClient({ initialSession }: { initialSession: Session | null }) {
  return (
    <main className="page loading">
      <section className="terminal-panel">
        <p className="eyebrow">production shell</p>
        <h1>mergeconflict is becoming dangerously real.</h1>
        <p className="lede">
          {initialSession?.user
            ? `Signed in as ${initialSession.user.name ?? initialSession.user.email ?? "GitHub developer"}.`
            : "GitHub login, repo ingestion, AI analysis, and durable swiping are being wired in."}
        </p>
      </section>
    </main>
  );
}
