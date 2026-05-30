import type { RepositoryProfile } from "@prisma/client";
import type { RepositoryProfileView } from "./product-types";

export function toRepositoryProfileView(repo: RepositoryProfile): RepositoryProfileView {
  return {
    id: repo.id,
    githubId: repo.githubId ?? undefined,
    name: repo.name,
    owner: repo.owner,
    fullName: repo.fullName,
    description: repo.description ?? "",
    avatarUrl: repo.avatarUrl ?? repo.ownerAvatarUrl ?? "",
    ownerAvatarUrl: repo.ownerAvatarUrl ?? repo.avatarUrl ?? "",
    bannerUrl: repo.bannerUrl ?? undefined,
    githubUrl: repo.githubUrl,
    issuesUrl: repo.issuesUrl,
    primaryLanguage: repo.primaryLanguage ?? "Unknown",
    languageColor: repo.languageColor ?? "#8B5CF6",
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    contributors: repo.contributors,
    goodFirstIssues: repo.goodFirstIssues,
    lastUpdated: repo.lastUpdated?.toISOString() ?? "Recently",
    license: repo.license ?? "Unknown",
    topics: repo.topics,
    techStack: repo.techStack,
    compatibility: repo.compatibility,
    onboardingDifficulty: repo.onboardingDifficulty,
    activityLevel: repo.activityLevel,
    documentationQuality:
      repo.documentationQuality === "SuspiciouslyPerfect" ? "Suspiciously Perfect" : repo.documentationQuality,
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
  };
}
