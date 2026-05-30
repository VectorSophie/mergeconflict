import type { SwipeDirection } from "./product-types";

export function resolveSwipe(repo: { compatibility: number }, direction: SwipeDirection) {
  if (direction === "left") {
    return { kind: "skip" as const, reason: "dismissed" as const };
  }

  if (direction === "up") {
    return { kind: "match" as const, reason: "super-like" as const };
  }

  if (repo.compatibility >= 70) {
    return { kind: "match" as const, reason: "compatibility" as const };
  }

  return { kind: "interested" as const, reason: "below-threshold" as const };
}

export function createChatGate(usedChats: number, isPaid: boolean) {
  const limit = 3;
  const remaining = isPaid ? Number.POSITIVE_INFINITY : Math.max(0, limit - usedChats);

  return {
    remaining,
    canOpenChat() {
      return isPaid || remaining > 0;
    },
  };
}

export function currentUsagePeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

export function getSwipeDirection(x: number, y: number): SwipeDirection | "none" {
  const threshold = 110;
  if (y < -120) return "up";
  if (x > threshold) return "right";
  if (x < -threshold) return "left";
  return "none";
}
