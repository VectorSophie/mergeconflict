import type { DeveloperSignals, RepositoryProfileView } from "./product-types";
import { seedRepositories } from "./seed-repos";

const githubApiBase = "https://api.github.com";

type GitHubOwner = {
  login: string;
  avatar_url: string;
};

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  open_issues_count: number;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  language: string | null;
  topics?: string[];
  license?: { spdx_id?: string | null } | null;
  owner: GitHubOwner;
};

type GitHubUser = {
  login: string;
  avatar_url: string;
  public_repos: number;
};

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Clojure: "#db5855",
  Svelte: "#ff3e00",
  Dart: "#00B4AB",
  Shell: "#89e051",
};

export async function githubFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${githubApiBase}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}

export function mapGitHubRepository(repo: GitHubRepository): RepositoryProfileView {
  const [owner, name] = repo.full_name.split("/");
  const language = repo.language ?? "Unknown";
  const ownerAvatarUrl = repo.owner.avatar_url;

  return {
    githubId: repo.id,
    owner: owner || repo.owner.login,
    name: name || repo.name,
    fullName: repo.full_name,
    description: repo.description ?? "No description yet. Mysterious, but not necessarily a red flag.",
    avatarUrl: ownerAvatarUrl,
    ownerAvatarUrl,
    bannerUrl: `https://opengraph.githubassets.com/mergeconflict/${repo.full_name}`,
    githubUrl: repo.html_url,
    issuesUrl: `${repo.html_url}/issues`,
    primaryLanguage: language,
    languageColor: languageColors[language] ?? "#8B5CF6",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    contributors: 0,
    goodFirstIssues: 0,
    lastUpdated: repo.pushed_at ?? "Recently",
    license: repo.license?.spdx_id ?? "Unknown",
    topics: repo.topics ?? [],
    techStack: [language, ...(repo.topics ?? []).slice(0, 3)].filter((item) => item && item !== "Unknown"),
    compatibility: 50,
    onboardingDifficulty: "Medium",
    activityLevel: inferActivity(repo),
    documentationQuality: "Okay",
    maintainerVibe: "active enough to have opinions, but still technically a stranger",
    contributorCulture: "contributors who bring context, small PRs, and receipts",
    personalityLine: `${repo.full_name} has real open source gravity and enough signals to deserve a closer look.`,
    aiPersonaTagline: `I am ${repo.full_name}. Read my issues before rewriting my soul.`,
    readmeSummary: "README analysis is pending. The repo is currently being judged by public metadata.",
    greenFlags: inferGreenFlags(repo),
    redFlags: inferRedFlags(repo),
    suggestedFirstContribution: "Review open issues with contributor-friendly labels and improve docs around the first confusing setup step.",
    whyYouMatch: "This repo overlaps with your GitHub languages, topics, or contribution patterns.",
    repoLoveLanguage: "Small, focused PRs with screenshots, tests, and a calm explanation.",
  };
}

export function scoreRepositoryCompatibility(signals: DeveloperSignals, repo: Pick<RepositoryProfileView, "primaryLanguage" | "topics" | "stars" | "openIssues" | "goodFirstIssues">) {
  let score = 42;

  if (signals.preferredLanguages.includes(repo.primaryLanguage)) score += 22;

  const normalizedTopics = repo.topics.map((topic) => topic.toLowerCase());
  const topicMatches = signals.preferredTopics.filter((topic) => normalizedTopics.includes(topic.toLowerCase())).length;
  score += Math.min(24, topicMatches * 12);

  if (repo.goodFirstIssues > 0) score += 8;
  if (repo.stars > 5000) score += 8;
  if (repo.openIssues > 20) score += 4;

  return Math.max(1, Math.min(100, score));
}

export async function fetchGitHubSignals(token: string): Promise<DeveloperSignals & { user: GitHubUser; repos: GitHubRepository[]; starred: GitHubRepository[]; watched: GitHubRepository[] }> {
  const user = await githubFetch<GitHubUser>("/user", token);
  const [repos, starred, watched] = await Promise.all([
    githubFetch<GitHubRepository[]>("/user/repos?per_page=50&sort=pushed&type=owner", token),
    githubFetch<GitHubRepository[]>("/user/starred?per_page=50&sort=updated", token),
    githubFetch<GitHubRepository[]>("/user/subscriptions?per_page=50", token),
  ]);

  const allRepos = [...repos, ...starred, ...watched];
  const preferredLanguages = topValues(allRepos.map((repo) => repo.language).filter(Boolean) as string[]);
  const preferredTopics = topValues(allRepos.flatMap((repo) => repo.topics ?? []));

  return {
    user,
    repos,
    starred,
    watched,
    githubLogin: user.login,
    preferredLanguages,
    preferredTopics,
    publicRepoCount: user.public_repos,
    starredRepoCount: starred.length,
  };
}

export async function discoverRepositories(token: string, signals: DeveloperSignals) {
  const language = signals.preferredLanguages[0] ? ` language:${encodeURIComponent(signals.preferredLanguages[0])}` : "";
  const topic = signals.preferredTopics[0] ? ` topic:${encodeURIComponent(signals.preferredTopics[0])}` : " topic:open-source";
  const searchQuery = encodeURIComponent(`stars:>1000${language}${topic}`);
  const searched = await githubFetch<{ items: GitHubRepository[] }>(`/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=15`, token);

  const seedResults = await Promise.allSettled(
    seedRepositories.map((fullName) => githubFetch<GitHubRepository>(`/repos/${fullName}`, token)),
  );

  const candidates = [
    ...searched.items,
    ...seedResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
  ];

  return dedupeByFullName(candidates).map((repo) => {
    const mapped = mapGitHubRepository(repo);
    return {
      ...mapped,
      compatibility: scoreRepositoryCompatibility(signals, mapped),
    };
  });
}

export async function hydrateRepositoryDetails(token: string, repo: RepositoryProfileView): Promise<RepositoryProfileView> {
  const encoded = encodeURIComponent(`repo:${repo.fullName} label:"good first issue" state:open`);
  const [contributors, goodFirstIssues] = await Promise.allSettled([
    githubFetch<unknown[]>(`/repos/${repo.fullName}/contributors?per_page=1&anon=true`, token),
    githubFetch<{ total_count: number }>(`/search/issues?q=${encoded}&per_page=1`, token),
  ]);

  return {
    ...repo,
    contributors: contributors.status === "fulfilled" ? contributors.value.length : repo.contributors,
    goodFirstIssues: goodFirstIssues.status === "fulfilled" ? goodFirstIssues.value.total_count : repo.goodFirstIssues,
  };
}

function inferActivity(repo: GitHubRepository): RepositoryProfileView["activityLevel"] {
  if (!repo.pushed_at) return "Medium";
  const updatedAt = new Date(repo.pushed_at).getTime();
  const ageInDays = (Date.now() - updatedAt) / 86_400_000;
  if (ageInDays < 7 && repo.open_issues_count > 500) return "Chaotic";
  if (ageInDays < 30) return "High";
  if (ageInDays < 180) return "Medium";
  return "Low";
}

function inferGreenFlags(repo: GitHubRepository) {
  const flags = [];
  if (repo.stargazers_count > 5000) flags.push("strong community signal");
  if ((repo.topics ?? []).length > 0) flags.push("clear topic metadata");
  if (repo.open_issues_count > 0) flags.push("visible contribution surface");
  return flags.length ? flags : ["public source", "discoverable repository", "open issues available"];
}

function inferRedFlags(repo: GitHubRepository) {
  const flags = [];
  if (repo.open_issues_count > 500) flags.push("large issue volume");
  if (!repo.description) flags.push("thin description");
  if (!repo.license?.spdx_id) flags.push("license unclear");
  return flags.length ? flags : ["needs README review", "maintainer expectations unknown"];
}

function topValues(values: string[], limit = 6) {
  const counts = values.reduce<Map<string, number>>((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map());

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function dedupeByFullName(repos: GitHubRepository[]) {
  const seen = new Set<string>();
  return repos.filter((repo) => {
    if (seen.has(repo.full_name)) return false;
    seen.add(repo.full_name);
    return true;
  });
}
