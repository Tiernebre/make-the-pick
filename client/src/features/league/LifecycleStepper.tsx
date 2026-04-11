import { Box, Group, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

type Phase =
  | "setup"
  | "pooling"
  | "scouting"
  | "drafting"
  | "competing"
  | "complete";

const PHASES: { id: Phase; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "pooling", label: "Pooling" },
  { id: "scouting", label: "Scouting" },
  { id: "drafting", label: "Drafting" },
  { id: "competing", label: "Competing" },
  { id: "complete", label: "Complete" },
];

// Inline keyframe for the current-phase pulse. Kept here so the stepper is
// self-contained and tree-shakeable.
const STEPPER_KEYFRAMES = `
@keyframes mtp-lifecycle-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(49, 202, 120, 0.55);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(49, 202, 120, 0);
  }
}
`;

interface LifecycleStepperProps {
  currentPhase: Phase | string;
}

export function LifecycleStepper({ currentPhase }: LifecycleStepperProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);
  return (
    <>
      <style>{STEPPER_KEYFRAMES}</style>
      <Group gap="xs" wrap="nowrap" role="group" aria-label="League lifecycle">
        {PHASES.map((phase, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;
          return (
            <Group key={phase.id} gap="xs" wrap="nowrap">
              <Box
                w={26}
                h={26}
                style={{
                  borderRadius: "50%",
                  background: isPast || isCurrent
                    ? "var(--mantine-color-mint-green-6)"
                    : "var(--mantine-color-gray-3)",
                  color: isFuture ? "var(--mantine-color-gray-7)" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  transition: "background 200ms ease, transform 200ms ease",
                  transform: isCurrent ? "scale(1.08)" : "scale(1)",
                  animation: isCurrent
                    ? "mtp-lifecycle-pulse 2400ms ease-out infinite"
                    : undefined,
                }}
                data-active={isCurrent || undefined}
                data-complete={isPast || undefined}
              >
                {isPast ? <IconCheck size={14} /> : index + 1}
              </Box>
              <Text
                size="sm"
                fw={isCurrent ? 700 : 500}
                c={isFuture ? "dimmed" : undefined}
              >
                {phase.label}
              </Text>
              {index < PHASES.length - 1 && (
                <Box
                  w={24}
                  h={2}
                  style={{
                    background: isPast
                      ? "var(--mantine-color-mint-green-6)"
                      : "var(--mantine-color-gray-3)",
                    transition: "background 400ms ease",
                  }}
                />
              )}
            </Group>
          );
        })}
      </Group>
    </>
  );
}
