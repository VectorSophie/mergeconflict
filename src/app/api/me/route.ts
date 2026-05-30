import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ user: null, authenticated: false });
  }

  const [developerProfile, usage] = await Promise.all([
    prisma.developerProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.usageCounter.findFirst({
      where: { userId: session.user.id, key: "repo-chat" },
      orderBy: { period: "desc" },
    }),
  ]);

  return Response.json({
    authenticated: true,
    user: session.user,
    hasDeveloperProfile: Boolean(developerProfile),
    chatUsage: usage?.count ?? 0,
  });
}
