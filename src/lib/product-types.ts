export type Difficulty = "Easy" | "Medium" | "Hard" | "Haunted";
export type ActivityLevel = "Low" | "Medium" | "High" | "Chaotic";
export type DocumentationQuality = "Sparse" | "Okay" | "Good" | "Excellent" | "Suspiciously Perfect";
export type SwipeDirection = "left" | "right" | "up";

export type DeveloperPersonality = {
  archetype: string;
  summary: string;
  strengths: string[];
  risks: string[];
  preferredLanguages: string[];
  preferredStacks: string[];
  architectureTendency: string;
  collaborationStyle: string;
  compatibilityStyle: string;
  representativeRepos: RepresentativeRepo[];
};

export type RepresentativeRepo = {
  name: string;
  language: string;
  reason: string;
  tag: string;
};

export type RepositoryProfileView = {
  id?: string;
  githubId?: number;
  name: string;
  owner: string;
  fullName: string;
  description: string;
  avatarUrl: string;
  ownerAvatarUrl: string;
  bannerUrl?: string;
  githubUrl: string;
  issuesUrl: string;
  primaryLanguage: string;
  languageColor: string;
  stars: number;
  forks: number;
  openIssues: number;
  contributors: number;
  goodFirstIssues: number;
  lastUpdated: string;
  license: string;
  topics: string[];
  techStack: string[];
  compatibility: number;
  onboardingDifficulty: Difficulty;
  activityLevel: ActivityLevel;
  documentationQuality: DocumentationQuality;
  maintainerVibe: string;
  contributorCulture: string;
  personalityLine: string;
  aiPersonaTagline: string;
  readmeSummary: string;
  greenFlags: string[];
  redFlags: string[];
  suggestedFirstContribution: string;
  whyYouMatch: string;
  repoLoveLanguage: string;
};

export type DeveloperSignals = {
  githubLogin?: string;
  preferredLanguages: string[];
  preferredTopics: string[];
  publicRepoCount?: number;
  starredRepoCount?: number;
};
