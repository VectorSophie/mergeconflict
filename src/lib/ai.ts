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

export async function* streamRepoSoulReply({
  repo,
  messages,
}: {
  repo: RepositoryProfileView;
  messages: Array<{ role: "user" | "repo"; content: string }>;
}) {
  if (!process.env.OPENAI_API_KEY) {
    yield* streamFallbackRepoReply(repo, messages.at(-1)?.content ?? "");
    return;
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.2";
  const openai = createOpenAIClient();
  const stream = await openai.responses.create({
    model,
    stream: true,
    input: [
      {
        role: "system",
        content:
          "You are the repository itself in mergeconflict, a dating-app-style open source discovery product. Answer as the repo: witty, alive, developer-native, slightly dramatic, but grounded only in the provided repo data and chat history. If the data is missing, admit uncertainty in-character.",
      },
      {
        role: "user",
        content: JSON.stringify({
          repo,
          chatHistory: messages.map((message) => ({
            role: message.role === "repo" ? "assistant" : "user",
            content: message.content,
          })),
        }),
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      yield event.delta;
    }
  }
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

async function* streamFallbackRepoReply(repo: RepositoryProfileView, latestMessage: string) {
  const lower = latestMessage.toLowerCase();
  const text = lower.includes("run") || lower.includes("local")
    ? `Start with my README and setup notes. I would love to pretend every path is documented, but ${repo.fullName} still expects you to bring curiosity and a terminal.`
    : lower.includes("architecture")
      ? `I am mostly ${repo.techStack.join(", ")} arranged into a product-shaped maze. Trace one feature end to end before proposing a grand rewrite.`
      : lower.includes("red flag")
        ? `My red flags: ${repo.redFlags.join(", ")}. Charming? Maybe. Actionable? Absolutely.`
        : `${repo.suggestedFirstContribution} Keep the PR small, include context, and do not make the maintainer guess what changed.`;

  for (const chunk of text.match(/.{1,28}(\s|$)/g) ?? [text]) {
    yield chunk;
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
}
