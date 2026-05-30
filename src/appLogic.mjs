export function resolveSwipe(repo, direction) {
  if (direction === 'left') {
    return { kind: 'skip', reason: 'dismissed' };
  }

  if (direction === 'up') {
    return { kind: 'match', reason: 'super-like' };
  }

  if (repo.compatibility >= 70) {
    return { kind: 'match', reason: 'compatibility' };
  }

  return { kind: 'interested', reason: 'below-threshold' };
}

export function createChatGate(usedChats, isPaid) {
  const limit = 3;
  const remaining = isPaid ? Infinity : Math.max(0, limit - usedChats);

  return {
    remaining,
    canOpenChat() {
      return isPaid || remaining > 0;
    }
  };
}

export function formatNumber(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

export function getSwipeDirection(x, y) {
  const threshold = 110;
  if (y < -120) return 'up';
  if (x > threshold) return 'right';
  if (x < -threshold) return 'left';
  return 'none';
}
