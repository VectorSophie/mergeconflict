import { resolveSwipe } from "@/lib/app-logic";
import { prisma } from "@/lib/prisma";
import type { SwipeDirection } from "@/lib/product-types";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const swipeRequestSchema = z.object({
  repositoryId: z.string().min(1),
  direction: z.enum(["left", "right", "up"]),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = swipeRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid swipe request" }, { status: 400 });
  }

  const repository = await prisma.repositoryProfile.findUnique({
    where: { id: parsed.data.repositoryId },
  });

  if (!repository) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  const result = resolveSwipe(repository, parsed.data.direction as SwipeDirection);

  const swipe = await prisma.swipe.create({
    data: {
      userId: user.id,
      repositoryId: repository.id,
      direction: parsed.data.direction,
      result: result.kind,
    },
  });

  const match =
    result.kind === "match"
      ? await prisma.match.upsert({
          where: {
            userId_repositoryId: {
              userId: user.id,
              repositoryId: repository.id,
            },
          },
          create: {
            userId: user.id,
            repositoryId: repository.id,
            reason: result.reason === "super-like" ? "super_like" : "compatibility",
          },
          update: {},
        })
      : null;

  return Response.json({
    swipe,
    match,
    result,
  });
}
