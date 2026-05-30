import { createChatGate, currentUsagePeriod } from "@/lib/app-logic";
import { streamRepoSoulReply } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { toRepositoryProfileView } from "@/lib/repository-view";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const chatRequestSchema = z.object({
  repositoryId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = chatRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request" }, { status: 400 });
  }

  const repository = await prisma.repositoryProfile.findUnique({
    where: { id: parsed.data.repositoryId },
  });

  if (!repository) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  const period = currentUsagePeriod();
  const [usage, existingThread] = await Promise.all([
    prisma.usageCounter.findUnique({
      where: { userId_key_period: { userId: user.id, key: "repo-chat", period } },
    }),
    prisma.chatThread.findUnique({
      where: {
        userId_repositoryId: {
          userId: user.id,
          repositoryId: repository.id,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
    }),
  ]);

  const isNewThread = !existingThread;
  const gate = createChatGate(usage?.count ?? 0, false);
  if (isNewThread && !gate.canOpenChat()) {
    return Response.json(
      {
        error: "Free repo soul chat limit reached",
        upgradePrompt: "You have used your 3 free repo soul chats this month.",
      },
      { status: 402 },
    );
  }

  const thread =
    existingThread ??
    (await prisma.chatThread.create({
      data: {
        userId: user.id,
        repositoryId: repository.id,
      },
      include: { messages: true },
    }));

  if (isNewThread) {
    await prisma.usageCounter.upsert({
      where: { userId_key_period: { userId: user.id, key: "repo-chat", period } },
      create: { userId: user.id, key: "repo-chat", period, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  const userMessage = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      role: "user",
      content: parsed.data.message,
    },
  });

  const encoder = new TextEncoder();
  const repoView = toRepositoryProfileView(repository);
  const history = [
    ...thread.messages.map((message) => ({ role: message.role === "repo" ? "repo" as const : "user" as const, content: message.content })),
    { role: "user" as const, content: userMessage.content },
  ];

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      try {
        for await (const chunk of streamRepoSoulReply({ repo: repoView, messages: history })) {
          assistantText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        await prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            role: "repo",
            content: assistantText,
            model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL ?? "gpt-5.2" : "fallback",
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown chat error";
        controller.enqueue(encoder.encode(`\nI hit a repo-soul runtime error: ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
