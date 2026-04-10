import { Text } from "@mantine/core";
import { useEffect, useState } from "react";

export interface PickTimerProps {
  /** ISO timestamp of when the current pick expires, or null if no timer. */
  deadline: string | null;
  /** Injectable "now" for tests. Defaults to `new Date()`. */
  now?: Date;
}

type TimerState = "normal" | "warning" | "urgent" | "expired";

const WARNING_THRESHOLD_SECONDS = 30;
const URGENT_THRESHOLD_SECONDS = 10;
const TICK_INTERVAL_MS = 250;

function computeSecondsRemaining(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

function stateForSeconds(seconds: number): TimerState {
  if (seconds <= 0) return "expired";
  if (seconds <= URGENT_THRESHOLD_SECONDS) return "urgent";
  if (seconds <= WARNING_THRESHOLD_SECONDS) return "warning";
  return "normal";
}

function colorForState(state: TimerState): string {
  switch (state) {
    case "urgent":
    case "expired":
      return "red.6";
    case "warning":
      return "yellow.6";
    case "normal":
    default:
      return "dimmed";
  }
}

function formatMMSS(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

const pulseKeyframes = `
@keyframes pick-timer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

export function PickTimer(
  { deadline, now }: PickTimerProps,
): JSX.Element | null {
  const initialNowMs = (now ?? new Date()).getTime();
  const deadlineMs = deadline ? new Date(deadline).getTime() : null;
  const [nowMs, setNowMs] = useState<number>(initialNowMs);

  useEffect(() => {
    if (deadlineMs === null) return;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [deadlineMs]);

  if (deadlineMs === null) {
    return null;
  }

  const secondsRemaining = computeSecondsRemaining(deadlineMs, nowMs);
  const state = stateForSeconds(secondsRemaining);
  const color = colorForState(state);
  const pulse = state === "urgent"
    ? { animation: "pick-timer-pulse 1s infinite" }
    : undefined;

  return (
    <div
      data-testid="pick-timer"
      data-state={state}
      aria-live="polite"
      aria-atomic="true"
      style={{ display: "inline-flex", flexDirection: "column", ...pulse }}
    >
      <style>{pulseKeyframes}</style>
      <Text size="xs" c="dimmed" tt="uppercase">
        Time left
      </Text>
      <Text fw={700} c={color} ff="monospace">
        {formatMMSS(secondsRemaining)}
      </Text>
      {state === "expired" && <Text size="xs" c="red.6">Time's up</Text>}
    </div>
  );
}
