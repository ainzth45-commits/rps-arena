export function movePickDeadlineFromSecondsLeft(secondsLeft: number, now = Date.now()): number {
  return now + Math.max(0, secondsLeft) * 1000;
}

export function movePickSecondsLeftFromDeadline(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function shouldRefreshMovePickDeadline(
  currentDeadline: number,
  incomingSecondsLeft: number,
  totalChanged: boolean,
  now = Date.now(),
): boolean {
  if (totalChanged) return true;
  const currentLeft = movePickSecondsLeftFromDeadline(currentDeadline, now);
  return Math.abs(incomingSecondsLeft - currentLeft) > 1;
}
