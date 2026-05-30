import type { RepositoryProfileView } from "./product-types";
import { prisma } from "./prisma";

export async function upsertRepositoryProfile(repo: RepositoryProfileView) {
  const data = {
    githubId: repo.githubId,
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    description: repo.description,
    avatarUrl: repo.avatarUrl,
    ownerAvatarUrl: repo.ownerAvatarUrl,
    bannerUrl: repo.bannerUrl,
    githubUrl: repo.githubUrl,
    issuesUrl: repo.issuesUrl,
    primaryLanguage: repo.primaryLanguage,
    languageColor: repo.languageColor,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    contributors: repo.contributors,
    goodFirstIssues: repo.goodFirstIssues,
    lastUpdated: parseLastUpdated(repo.lastUpdated),
    license: repo.license,
    topics: repo.topics,
    techStack: repo.techStack,
    compatibility: repo.compatibility,
    onboardingDifficulty: repo.onboardingDifficulty,
    activityLevel: repo.activityLevel,
    documentationQuality: repo.documentationQuality === "Suspiciously Perfect" ? "SuspiciouslyPerfect" : repo.documentationQuality,
    maintainerVibe: repo.maintainerVibe,
    contributorCulture: repo.contributorCulture,
    personalityLine: repo.personalityLine,
    aiPersonaTagline: repo.aiPersonaTagline,
    readmeSummary: repo.readmeSummary,
    greenFlags: repo.greenFlags,
    redFlags: repo.redFlags,
    suggestedFirstContribution: repo.suggestedFirstContribution,
    whyYouMatch: repo.whyYouMatch,
    repoLoveLanguage: repo.repoLoveLanguage,
  } as const;

  return prisma.repositoryProfile.upsert({
    where: { fullName: repo.fullName },
    create: data,
    update: data,
  });
}

function parseLastUpdated(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
