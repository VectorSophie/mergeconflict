import OpenAI from "openai";
import { z } from "zod";
import type { DeveloperPersonality, DeveloperSignals, RepositoryProfileView } from "./product-types";

export const representativeRepoSchema = z.object({
  name: z.string().min(1),
  language: z.string().min(1),
  reason: z.string().min(1),
  tag: z.string().min(1),
});

export const developerPersonalitySchema = z.object({
  archetype: z.string().min(1),
  summary: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1).max(8),
  risks: z.array(z.string().min(1)).min(1).max(8),
  preferredLanguages: z.array(z.string().min(1)).min(1).max(8),
  preferredStacks: z.array(z.string().min(1)).min(1).max(8),
  architectureTendency: z.string().min(1),
  collaborationStyle: z.string().min(1),
  compatibilityStyle: z.string().min(1),
  representativeRepos: z.array(representativeRepoSchema).min(1).max(3),
});

export const repositoryEnrichmentSchema = z.object({
  onboardingDifficulty: z.enum(["Easy", "Medium", "Hard", "Haunted"]),
  documentationQuality: z.enum(["Sparse", "Okay", "Good", "Excellent", "Suspiciously Perfect"]),
  maintainerVibe: z.string().min(1),
  contributorCulture: z.string().min(1),
  personalityLine: z.string().min(1),
  aiPersonaTagline: z.string().min(1),
  readmeSummary: z.string().min(1),
  greenFlags: z.array(z.string().min(1)).min(1).max(6),
  redFlags: z.array(z.string().min(1)).min(1).max(6),
  suggestedFirstContribution: z.string().min(1),
  whyYouMatch: z.string().min(1),
  repoLoveLanguage: z.string().min(1),
});

export async function generateDeveloperPersonality(signals: DeveloperSignals): Promise<DeveloperPersonality & { generatedByModel: string }> {
  const model = process.env.OPENAI_FAST_MODEL ?? "gpt-5-mini";

  if (!process.env.OPENAI_API_KEY) {
    return { ...fallbackDeveloperPersonality(signals), generatedByModel: "fallback" };
  }

  const openai = createOpenAIClient();
  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You generate witty, developer-native personality cards for an open source discovery dating app. Use only the provided GitHub signals. Return strict JSON.",
      },
      {
        role: "user",
        content: JSON.stringify(signals),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "developer_personality",
        strict: true,
        schema: z.toJSONSchema(developerPersonalitySchema),
      },
    },
  });

  const parsed = developerPersonalitySchema.parse(JSON.parse(response.output_text));
  return { ...parsed, generatedByModel: model };
}

export async function enrichRepositoryProfile(
  repo: RepositoryProfileView,
  personality: DeveloperPersonality,
): Promise<RepositoryProfileView & { generatedByModel: string }> {
  const model = process.env.OPENAI_FAST_MODEL ?? "gpt-5-mini";

  if (!process.env.OPENAI_API_KEY) {
    return { ...repo, generatedByModel: "fallback" };
  }

  const openai = createOpenAIClient();
  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You enrich GitHub repository metadata into a useful, witty repo dating profile. Stay grounded in provided metadata. If data is missing, admit uncertainty in-character.",
      },
      {
        role: "user",
        content: JSON.stringify({ repo, personality }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "repository_enrichment",
        strict: true,
        schema: z.toJSONSchema(repositoryEnrichmentSchema),
      },
    },
  });

  const enrichment = repositoryEnrichmentSchema.parse(JSON.parse(response.output_text));
  return { ...repo, ...enrichment, generatedByModel: model };
}

export function fallbackDeveloperPersonality(signals: DeveloperSignals): DeveloperPersonality {
  const languages = signals.preferredLanguages.length ? signals.preferredLanguages : ["TypeScript"];
  const topics = signals.preferredTopics.length ? signals.preferredTopics : ["developer-tools"];

  return {
    archetype: "Experimental Systems Architect",
    summary:
      "You build fast, connect strange ideas, and appear dangerously comfortable around repos with ambition and unresolved architecture feelings.",
    strengths: ["rapid prototyping", "creative abstractions", "developer-tool instincts", "issue-thread stamina"],
    risks: ["scope drift", "overengineering under moonlight", "starting three branches before stabilizing one"],
    preferredLanguages: languages,
    preferredStacks: topics,
    architectureTendency: "Composable first, dramatic refactor second.",
    collaborationStyle: "Async-first, context-heavy, fond of screenshots and clear reproduction steps.",
    compatibilityStyle: "Best with active maintainers, clear issues, and repos that need useful chaos.",
    representativeRepos: languages.slice(0, 3).map((language, index) => ({
      name: `${signals.githubLogin ?? "developer"}/${topics[index] ?? "sidequest"}`,
      language,
      reason: "Derived from public GitHub activity signals.",
      tag: index === 0 ? "primary signal" : "compatibility clue",
    })),
  };
}

function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
