import { describe, expect, it } from "vitest";
import { mapGitHubRepository, scoreRepositoryCompatibility } from "./github";

describe("mapGitHubRepository", () => {
  it("maps GitHub repository payloads into repository card input", () => {
    const repo = mapGitHubRepository({
      id: 123,
      name: "ai-toolkit",
      full_name: "octo/ai-toolkit",
      description: "AI tools for builders",
      html_url: "https://github.com/octo/ai-toolkit",
      open_issues_count: 9,
      stargazers_count: 1200,
      forks_count: 80,
      pushed_at: "2026-05-01T00:00:00Z",
      language: "TypeScript",
      topics: ["ai", "typescript", "developer-tools"],
      license: { spdx_id: "MIT" },
      owner: {
        login: "octo",
        avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
      },
    });

    expect(repo).toMatchObject({
      githubId: 123,
      owner: "octo",
      name: "ai-toolkit",
      fullName: "octo/ai-toolkit",
      primaryLanguage: "TypeScript",
      languageColor: "#3178c6",
      stars: 1200,
      forks: 80,
      openIssues: 9,
      license: "MIT",
      topics: ["ai", "typescript", "developer-tools"],
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    });
  });
});

describe("scoreRepositoryCompatibility", () => {
  it("rewards matching languages and topics without exceeding 100", () => {
    const score = scoreRepositoryCompatibility(
      {
        preferredLanguages: ["TypeScript", "Rust"],
        preferredTopics: ["ai", "developer-tools"],
      },
      {
        primaryLanguage: "TypeScript",
        topics: ["ai", "developer-tools", "llm"],
        stars: 90000,
        openIssues: 400,
        goodFirstIssues: 6,
      },
    );

    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(100);
  });
});
