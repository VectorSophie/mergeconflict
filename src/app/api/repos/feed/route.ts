import { discoverRepositories, fetchGitHubSignals, hydrateRepositoryDetails } from "@/lib/github";
import { upsertRepositoryProfile } from "@/lib/repository-store";
import { getGitHubAccessToken, requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getGitHubAccessToken(user.id);
  if (!token) {
    return Response.json({ error: "Missing GitHub access token" }, { status: 401 });
  }

  const signals = await fetchGitHubSignals(token);
  const candidates = await discoverRepositories(token, signals);
  const hydrated = await Promise.all(candidates.slice(0, 20).map((repo) => hydrateRepositoryDetails(token, repo)));
  const stored = await Promise.all(hydrated.map((repo) => upsertRepositoryProfile(repo)));

  return Response.json({
    repos: hydrated.map((repo, index) => ({ ...repo, id: stored[index].id })),
    signals: {
      githubLogin: signals.githubLogin,
      preferredLanguages: signals.preferredLanguages,
      preferredTopics: signals.preferredTopics,
      publicRepoCount: signals.publicRepoCount,
      starredRepoCount: signals.starredRepoCount,
    },
  });
}
