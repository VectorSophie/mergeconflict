import { auth } from "@/auth";
import { prisma } from "./prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function getGitHubAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });

  return account?.access_token ?? null;
}
