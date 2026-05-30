"use client";

import type { Session } from "next-auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { createChatGate, formatNumber, getSwipeDirection, resolveSwipe } from "@/lib/app-logic";
import { demoPersonality, demoRepositories } from "@/lib/demo-data";
import type { DeveloperPersonality, RepositoryProfileView, SwipeDirection } from "@/lib/product-types";

type Screen = "landing" | "loading" | "personality" | "swipe" | "match" | "chat" | "pricing";
type ChatMessage = { role: "user" | "repo"; content: string };

export function AppClient({ initialSession }: { initialSession: Session | null }) {
  const [screen, setScreen] = useState<Screen>("landing");
  const [personality, setPersonality] = useState<DeveloperPersonality | null>(null);
  const [repos, setRepos] = useState<RepositoryProfileView[]>(demoRepositories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeMatch, setActiveMatch] = useState<RepositoryProfileView | null>(null);
  const [detailRepo, setDetailRepo] = useState<RepositoryProfileView | null>(null);
  const [chatRepo, setChatRepo] = useState<RepositoryProfileView | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatUsage, setChatUsage] = useState(0);
  const [interested, setInterested] = useState(0);
  const [matches, setMatches] = useState(0);
  const [status, setStatus] = useState("Ready to judge your dependencies romantically.");
  const isAuthenticated = Boolean(initialSession?.user);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  const currentRepo = repos[currentIndex % repos.length] ?? demoRepositories[0];
  const nextRepo = repos[(currentIndex + 1) % repos.length] ?? demoRepositories[1];

  async function startDemo(useRealAuth: boolean) {
    if (useRealAuth && !isAuthenticated) {
      window.location.href = "/api/auth/signin/github";
      return;
    }

    setScreen("loading");
    setStatus(isAuthenticated ? "Reading public GitHub signals..." : "Running demo analysis with seeded repo chemistry...");

    if (!isAuthenticated) {
      setTimeout(() => {
        setPersonality(demoPersonality);
        setRepos(demoRepositories);
        setScreen("personality");
      }, 1300);
      return;
    }

    try {
      const analysis = await fetch("/api/analyze", { method: "POST" });
      if (!analysis.ok) throw new Error(await analysis.text());
      const analysisJson = await analysis.json();
      const feed = await fetch("/api/repos/feed");
      if (!feed.ok) throw new Error(await feed.text());
      const feedJson = await feed.json();
      setPersonality(analysisJson.personality);
      setRepos(feedJson.repos?.length ? feedJson.repos : demoRepositories);
      setScreen("personality");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Fell back to demo mode.");
      setPersonality(demoPersonality);
      setRepos(demoRepositories);
      setScreen("personality");
    }
  }

  async function handleSwipe(direction: SwipeDirection) {
    const repo = detailRepo ?? currentRepo;
    const result = resolveSwipe(repo, direction);
    setDetailRepo(null);

    if (isAuthenticated && repo.id && !repo.id.startsWith("demo-")) {
      fetch("/api/swipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: repo.id, direction }),
      }).catch(() => undefined);
    }

    if (result.kind === "interested") setInterested((value) => value + 1);
    if (result.kind === "match") {
      setMatches((value) => value + 1);
      setActiveMatch(repo);
      setCurrentIndex((value) => value + 1);
      setScreen("match");
      return;
    }

    setCurrentIndex((value) => value + 1);
  }

  function openChat(repo: RepositoryProfileView) {
    const gate = createChatGate(chatUsage, false);
    if (!gate.canOpenChat() && !messages.length) {
      setScreen("pricing");
      return;
    }

    setChatRepo(repo);
    setMessages([
      { role: "repo", content: repo.aiPersonaTagline },
      { role: "repo", content: `Start with this: ${repo.suggestedFirstContribution}` },
    ]);
    if (!messages.length) setChatUsage((value) => value + 1);
    setScreen("chat");
  }

  async function sendMessage(text: string) {
    if (!chatRepo || !text.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    setMessages((value) => [...value, userMessage, { role: "repo", content: "" }]);

    if (!isAuthenticated || !chatRepo.id || chatRepo.id.startsWith("demo-")) {
      const reply = fallbackChat(chatRepo, text);
      setMessages((value) => [...value.slice(0, -1), { role: "repo", content: reply }]);
      return;
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repositoryId: chatRepo.id, message: text }),
    });

    if (response.status === 402) {
      setScreen("pricing");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let reply = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      reply += decoder.decode(value);
      setMessages((current) => [...current.slice(0, -1), { role: "repo", content: reply }]);
    }
  }

  return (
    <>
      <Background />
      {screen === "landing" && <Landing onStart={() => startDemo(true)} onDemo={() => startDemo(false)} />}
      {screen === "loading" && <AnalysisLoading status={status} />}
      {screen === "personality" && personality && <Personality personality={personality} onContinue={() => setScreen("swipe")} />}
      {screen === "swipe" && (
        <Swipe
          current={currentRepo}
          next={nextRepo}
          matches={matches}
          interested={interested}
          chatsLeft={Math.max(0, 3 - chatUsage)}
          onSwipe={handleSwipe}
          onDetail={setDetailRepo}
          onPricing={() => setScreen("pricing")}
        />
      )}
      {screen === "match" && activeMatch && (
        <MatchScreen repo={activeMatch} onChat={() => openChat(activeMatch)} onSwipe={() => setScreen("swipe")} onDetail={setDetailRepo} />
      )}
      {screen === "chat" && chatRepo && (
        <RepoSoulChat repo={chatRepo} messages={messages} onSend={sendMessage} onBack={() => setScreen("swipe")} />
      )}
      {screen === "pricing" && <Pricing onBack={() => setScreen(chatRepo ? "chat" : "swipe")} />}
      {detailRepo && <RepoDetail repo={detailRepo} onClose={() => setDetailRepo(null)} onSwipe={handleSwipe} />}
    </>
  );
}

function Background() {
  return (
    <>
      <div className="ambient"><span /><span /><span /></div>
      <div className="grid-bg" />
    </>
  );
}

function Landing({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <main className="landing page">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">mergeconflict</p>
          <h1>Find the repository you were meant to commit to.</h1>
          <p className="lede">Swipe through open source projects, match with codebases that fit your developer personality, and chat with the repo before your first pull request.</p>
          <div className="actions">
            <button className="neon primary" onClick={onStart}>Login with GitHub</button>
            <button className="neon ghost" onClick={onDemo}>Explore Demo</button>
          </div>
          <p className="micro">Your next open source dependency might be emotionally available.</p>
        </div>
        <div className="graph-card" aria-label="Animated repository graph">
          {demoRepositories.map((repo, index) => <button key={repo.fullName} className={`repo-node n${index}`} onClick={onDemo}><span>{initials(repo)}</span><small>{repo.primaryLanguage}</small></button>)}
          <svg viewBox="0 0 560 560" aria-hidden="true">
            <path d="M80 110 C160 40 260 140 340 90 S500 130 490 260 C470 430 300 390 240 500 C160 420 50 390 90 250" />
            <path d="M120 430 C210 310 300 330 410 170" />
            <path d="M95 250 C220 190 360 230 485 260" />
          </svg>
        </div>
      </section>
    </main>
  );
}

function AnalysisLoading({ status }: { status: string }) {
  const lines = useMemo(() => [
    "Reading commit history like a tiny judgmental oracle...",
    "Detecting unfinished side projects...",
    "Calculating chaos compatibility...",
    status,
  ], [status]);

  return (
    <main className="page loading">
      <section className="terminal-panel">
        <p className="eyebrow">github analysis</p>
        <h1>Generating your developer dating profile.</h1>
        <div className="terminal-lines">
          {lines.map((line, index) => <p key={line} style={{ "--delay": `${index * 0.35}s` } as React.CSSProperties}><span>$</span> {line}</p>)}
        </div>
        <div className="progress"><span /></div>
      </section>
    </main>
  );
}

function Personality({ personality, onContinue }: { personality: DeveloperPersonality; onContinue: () => void }) {
  return (
    <main className="page personality-layout">
      <section className="personality-card">
        <p className="eyebrow">developer personality</p>
        <h1>{personality.archetype}</h1>
        <p className="lede">{personality.summary}</p>
        <div className="split">
          <div><h2>Strengths</h2><Tags items={personality.strengths} /></div>
          <div><h2>Risks</h2><Tags items={personality.risks} /></div>
        </div>
        <div className="profile-grid">
          <p><b>Stack:</b> {personality.preferredStacks.join(", ")}</p>
          <p><b>Architecture:</b> {personality.architectureTendency}</p>
          <p><b>Collaboration:</b> {personality.collaborationStyle}</p>
          <p><b>Compatibility:</b> {personality.compatibilityStyle}</p>
        </div>
        <h2>Representative repos</h2>
        <div className="mini-repos">
          {personality.representativeRepos.map((repo) => <article key={repo.name}><b>{repo.name}</b><span>{repo.language}</span><p>{repo.reason}</p><em>{repo.tag}</em></article>)}
        </div>
        <div className="actions">
          <button className="neon ghost">Export Image</button>
          <button className="neon primary" onClick={onContinue}>Start Swiping</button>
        </div>
      </section>
    </main>
  );
}

function Swipe(props: { current: RepositoryProfileView; next: RepositoryProfileView; matches: number; interested: number; chatsLeft: number; onSwipe: (direction: SwipeDirection) => void; onDetail: (repo: RepositoryProfileView) => void; onPricing: () => void }) {
  return (
    <main className="page swipe-layout">
      <aside className="side-panel">
        <p className="eyebrow">repo romance feed</p>
        <h1>Swipe like the issue tracker is watching.</h1>
        <p>Matches trigger at 70% compatibility. Super Like always creates a match because confidence is sometimes architecture.</p>
        <div className="side-stats">
          <span><b>{props.matches}</b>matched</span>
          <span><b>{props.interested}</b>interested</span>
          <span><b>{props.chatsLeft}</b>free chats left</span>
        </div>
        <button className="link-button" onClick={props.onPricing}>Upgrade to Committer</button>
      </aside>
      <section className="deck-wrap" aria-label="Swipe repository deck">
        <div className="deck">
          <RepoCard repo={props.next} position="back" onDetail={props.onDetail} />
          <DraggableRepoCard repo={props.current} onSwipe={props.onSwipe} onDetail={props.onDetail} />
        </div>
        <div className="swipe-actions">
          <button className="round skip" onClick={() => props.onSwipe("left")} aria-label="Skip">x<span>Skip</span></button>
          <button className="round super" onClick={() => props.onSwipe("up")} aria-label="Contribute Tonight">↑<span>Contribute Tonight</span></button>
          <button className="round yes" onClick={() => props.onSwipe("right")} aria-label="Interested">♥<span>Interested</span></button>
        </div>
      </section>
    </main>
  );
}

function DraggableRepoCard({ repo, onSwipe, onDetail }: { repo: RepositoryProfileView; onSwipe: (direction: SwipeDirection) => void; onDetail: (repo: RepositoryProfileView) => void }) {
  const cardRef = useRef<HTMLElement | null>(null);
  const start = useRef({ x: 0, y: 0, dragging: false });

  return (
    <RepoCard
      repo={repo}
      position="front"
      refCallback={(node) => { cardRef.current = node; }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        start.current = { x: event.clientX, y: event.clientY, dragging: true };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.classList.add("dragging");
      }}
      onPointerMove={(event) => {
        if (!start.current.dragging) return;
        const x = event.clientX - start.current.x;
        const y = event.clientY - start.current.y;
        event.currentTarget.style.transform = `translate(${x}px, ${y}px) rotate(${x / 18}deg) scale(1.02)`;
        event.currentTarget.dataset.intent = getSwipeDirection(x, y);
      }}
      onPointerUp={(event) => {
        if (!start.current.dragging) return;
        start.current.dragging = false;
        const x = event.clientX - start.current.x;
        const y = event.clientY - start.current.y;
        const direction = getSwipeDirection(x, y);
        event.currentTarget.classList.remove("dragging");
        if (direction === "none") {
          event.currentTarget.style.transform = "";
          event.currentTarget.dataset.intent = "none";
          return;
        }
        event.currentTarget.classList.add(`exit-${direction}`);
        setTimeout(() => onSwipe(direction), 220);
      }}
      onDetail={onDetail}
    />
  );
}

function RepoCard({ repo, position, onDetail, refCallback, onPointerDown, onPointerMove, onPointerUp }: { repo: RepositoryProfileView; position: "front" | "back"; onDetail: (repo: RepositoryProfileView) => void; refCallback?: (node: HTMLElement | null) => void; onPointerDown?: React.PointerEventHandler<HTMLElement>; onPointerMove?: React.PointerEventHandler<HTMLElement>; onPointerUp?: React.PointerEventHandler<HTMLElement> }) {
  return (
    <article ref={refCallback} className={`repo-card ${position}`} data-card={position} style={{ "--lang": repo.languageColor } as React.CSSProperties} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div className="swipe-label left">SKIP</div><div className="swipe-label right">INTERESTED</div><div className="swipe-label up">CONTRIBUTE TONIGHT</div>
      <div className="repo-visual">
        <img className="repo-avatar-img" src={repo.ownerAvatarUrl} alt="" />
        <div className="compat">{repo.compatibility}%</div>
      </div>
      <div className="repo-head"><p className="eyebrow">{repo.owner}</p><h2>{repo.name}</h2><p>{repo.description}</p></div>
      <div className="stats-row">
        <span><b>{formatNumber(repo.stars)}</b>stars</span><span><b>{formatNumber(repo.forks)}</b>forks</span><span><b>{formatNumber(repo.openIssues)}</b>issues</span><span><b>{formatNumber(repo.contributors)}</b>contributors</span>
      </div>
      <div className="tags"><Tags items={[repo.primaryLanguage, ...repo.topics.slice(0, 3), repo.onboardingDifficulty]} /></div>
      <div className="repo-personality"><h3>Repo Personality</h3><p>{repo.personalityLine}</p></div>
      <p className="hook"><b>Suggested first contribution:</b> {repo.suggestedFirstContribution}</p>
      <button className="details-button" onClick={() => onDetail(repo)}>Open profile</button>
    </article>
  );
}

function MatchScreen({ repo, onChat, onSwipe, onDetail }: { repo: RepositoryProfileView; onChat: () => void; onSwipe: () => void; onDetail: (repo: RepositoryProfileView) => void }) {
  return (
    <main className="match-screen">
      <div className="merge-lines" />
      <section className="match-panel">
        <p className="eyebrow">merge detected</p><h1>MERGECONFLICT</h1>
        <h2>You matched with {repo.fullName}</h2>
        <p className="lede">Compatibility: {repo.compatibility}%. Merge risk: legally concerning.</p>
        <p>{repo.aiPersonaTagline}</p>
        <div className="tags"><Tags items={repo.techStack.slice(0, 4)} /></div>
        <p><b>First contribution:</b> {repo.suggestedFirstContribution}</p>
        {repo.compatibility >= 85 && <p className="noticed">This repo already noticed your commit history.</p>}
        <div className="actions"><button className="neon primary" onClick={onChat}>Chat with Repo</button><button className="neon ghost" onClick={onSwipe}>Keep Swiping</button><button className="neon ghost" onClick={() => onDetail(repo)}>Open Repo Profile</button></div>
      </section>
    </main>
  );
}

function RepoSoulChat({ repo, messages, onSend, onBack }: { repo: RepositoryProfileView; messages: ChatMessage[]; onSend: (message: string) => void; onBack: () => void }) {
  const [text, setText] = useState("");
  const prompts = ["How do I run you locally?", "What should I contribute first?", "Explain your architecture.", "What are your red flags?", "Draft my first issue comment."];
  return (
    <main className="page chat-layout">
      <section className="chat-panel">
        <header><img className="avatar small repo-avatar-inline" src={repo.ownerAvatarUrl} alt="" /><div><p className="eyebrow">repo soul chat</p><h1>{repo.fullName}</h1></div><span className="compat mini">{repo.compatibility}%</span></header>
        <div className="messages">{messages.map((message, index) => <p key={index} className={message.role === "user" ? "user" : ""}><span>{message.role === "repo" ? repo.name : "you"}</span>{message.content || "..."}</p>)}</div>
        <div className="quick-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => onSend(prompt)}>{prompt}</button>)}</div>
        <form className="chat-form" onSubmit={(event) => { event.preventDefault(); onSend(text); setText(""); }}>
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask the repo where to begin..." />
          <button className="neon primary">Send</button>
        </form>
        <button className="link-button" onClick={onBack}>Back to swipes</button>
      </section>
    </main>
  );
}

function Pricing({ onBack }: { onBack: () => void }) {
  return (
    <main className="page pricing-layout">
      <section className="pricing-card">
        <p className="eyebrow">committer tier</p>
        <h1>$5/month</h1>
        <p className="lede">Billing is coming soon. For now, your free repo soul chat limit is enforced server-side.</p>
        <ul><li>Unlimited swipes and matches</li><li>Unlimited repo soul chats</li><li>Contribution roadmap generation</li><li>Weekly personalized repo recommendations</li></ul>
        <button className="neon primary" onClick={onBack}>Back</button>
      </section>
    </main>
  );
}

function RepoDetail({ repo, onClose, onSwipe }: { repo: RepositoryProfileView; onClose: () => void; onSwipe: (direction: SwipeDirection) => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">x</button>
        <div className="repo-visual modal-visual" style={{ "--lang": repo.languageColor } as React.CSSProperties}><img className="repo-avatar-img" src={repo.ownerAvatarUrl} alt="" /><div className="compat">{repo.compatibility}%</div></div>
        <p className="eyebrow">{repo.fullName}</p><h1>{repo.name}</h1><p className="lede">{repo.description}</p>
        <div className="profile-grid"><p><b>Activity:</b> {repo.activityLevel}</p><p><b>Difficulty:</b> {repo.onboardingDifficulty}</p><p><b>Docs:</b> {repo.documentationQuality}</p><p><b>Culture:</b> {repo.contributorCulture}</p><p><b>Maintainer vibe:</b> {repo.maintainerVibe}</p><p><b>Repo love language:</b> {repo.repoLoveLanguage}</p></div>
        <h2>Why you might match</h2><p>{repo.whyYouMatch}</p>
        <div className="split"><div><h2>Green flags</h2><Tags items={repo.greenFlags} /></div><div><h2>Red flags</h2><Tags items={repo.redFlags} /></div></div>
        <h2>README summary</h2><p>{repo.readmeSummary}</p>
        <div className="actions"><button className="neon ghost" onClick={() => onSwipe("left")}>Skip</button><button className="neon primary" onClick={() => onSwipe("right")}>Interested</button><button className="neon hot" onClick={() => onSwipe("up")}>Contribute Tonight</button><a className="neon ghost" href={repo.githubUrl} target="_blank">Open on GitHub</a><a className="neon ghost" href={repo.issuesUrl} target="_blank">View Issues</a></div>
      </section>
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  return <>{items.map((item) => <span className="tag" key={item}>{item}</span>)}</>;
}

function initials(repo: RepositoryProfileView) {
  return repo.name.split(/[-_/]/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function fallbackChat(repo: RepositoryProfileView, text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("run") || lower.includes("local")) return `Start with my README and setup notes. I would love to pretend every path is documented, but ${repo.fullName} still expects curiosity and a terminal.`;
  if (lower.includes("architecture")) return `I am mostly ${repo.techStack.join(", ")} arranged into a product-shaped maze. Trace one feature end to end before proposing a grand rewrite.`;
  if (lower.includes("red flag")) return `My red flags: ${repo.redFlags.join(", ")}. Charming? Maybe. Actionable? Absolutely.`;
  return `${repo.suggestedFirstContribution} Keep the PR small, include context, and do not make the maintainer guess what changed.`;
}
