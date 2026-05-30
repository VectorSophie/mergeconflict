import { generateDeveloperPersonality } from "@/lib/ai";
import { fetchGitHubSignals } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { getGitHubAccessToken, requireUser } from "@/lib/session";

export async function POST() {
  const user = await requireUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getGitHubAccessToken(user.id);
  if (!token) {
    return Response.json({ error: "Missing GitHub access token" }, { status: 401 });
  }

  const existing = await prisma.developerProfile.findUnique({ where: { userId: user.id } });
  if (existing) {
    return Response.json({ personality: deserializeDeveloperProfile(existing), cached: true });
  }

  const signals = await fetchGitHubSignals(token);
  const personality = await generateDeveloperPersonality(signals);

  const saved = await prisma.developerProfile.create({
    data: {
      userId: user.id,
      archetype: personality.archetype,
      summary: personality.summary,
      strengths: personality.strengths,
      risks: personality.risks,
      preferredLanguages: personality.preferredLanguages,
      preferredStacks: personality.preferredStacks,
      architectureTendency: personality.architectureTendency,
      collaborationStyle: personality.collaborationStyle,
      compatibilityStyle: personality.compatibilityStyle,
      representativeRepos: personality.representativeRepos,
      githubSignals: {
        githubLogin: signals.githubLogin,
        preferredLanguages: signals.preferredLanguages,
        preferredTopics: signals.preferredTopics,
        publicRepoCount: signals.publicRepoCount,
        starredRepoCount: signals.starredRepoCount,
      },
      generatedByModel: personality.generatedByModel,
    },
  });

  return Response.json({ personality: deserializeDeveloperProfile(saved), cached: false });
}

function deserializeDeveloperProfile(profile: {
  archetype: string;
  summary: string;
  strengths: string[];
  risks: string[];
  preferredLanguages: string[];
  preferredStacks: string[];
  architectureTendency: string;
  collaborationStyle: string;
  compatibilityStyle: string;
  representativeRepos: unknown;
}) {
  return {
    archetype: profile.archetype,
    summary: profile.summary,
    strengths: profile.strengths,
    risks: profile.risks,
    preferredLanguages: profile.preferredLanguages,
    preferredStacks: profile.preferredStacks,
    architectureTendency: profile.architectureTendency,
    collaborationStyle: profile.collaborationStyle,
    compatibilityStyle: profile.compatibilityStyle,
    representativeRepos: profile.representativeRepos,
  };
}
