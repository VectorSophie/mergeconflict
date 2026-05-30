import { describe, expect, it } from "vitest";
import { developerPersonalitySchema, repositoryEnrichmentSchema } from "./ai";

describe("developerPersonalitySchema", () => {
  it("accepts complete structured personality output", () => {
    const parsed = developerPersonalitySchema.parse({
      archetype: "Experimental Systems Architect",
      summary: "Builds fast and likes strange tools.",
      strengths: ["rapid prototyping"],
      risks: ["scope drift"],
      preferredLanguages: ["TypeScript"],
      preferredStacks: ["AI tooling"],
      architectureTendency: "Composable first.",
      collaborationStyle: "Async with receipts.",
      compatibilityStyle: "Best with active maintainers.",
      representativeRepos: [
        {
          name: "octo/ai-toolkit",
          language: "TypeScript",
          reason: "AI-heavy repo",
          tag: "model whisperer",
        },
      ],
    });

    expect(parsed.archetype).toBe("Experimental Systems Architect");
  });
});

describe("repositoryEnrichmentSchema", () => {
  it("requires repo-specific contribution guidance", () => {
    const result = repositoryEnrichmentSchema.safeParse({
      onboardingDifficulty: "Medium",
      documentationQuality: "Good",
      maintainerVibe: "fast-moving but clear",
      contributorCulture: "small PRs with screenshots",
      personalityLine: "A repo with product gravity.",
      aiPersonaTagline: "I ship quickly and expect context.",
      readmeSummary: "A concise README summary.",
      greenFlags: ["active issues"],
      redFlags: ["large surface area"],
      suggestedFirstContribution: "Improve the setup docs for first-time contributors.",
      whyYouMatch: "Your TypeScript and AI interests overlap.",
      repoLoveLanguage: "Focused PRs with tests.",
    });

    expect(result.success).toBe(true);
  });
});
