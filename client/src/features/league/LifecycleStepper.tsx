import { Box, Group, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

type Phase = "setup" | "drafting" | "competing" | "complete";

const PHASES: { id: Phase; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "drafting", label: "Drafting" },
  { id: "competing", label: "Competing" },
  { id: "complete", label: "Complete" },
];

interface LifecycleStepperProps {
  currentPhase: Phase | string;
}

export function LifecycleStepper({ currentPhase }: LifecycleStepperProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);
  return (
    <Group gap="xs" wrap="nowrap" role="group" aria-label="League lifecycle">
      {PHASES.map((phase, index) => {
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        const isFuture = index > currentIndex;
        return (
          <Group key={phase.id} gap="xs" wrap="nowrap">
            <Box
              w={24}
              h={24}
              style={{
                borderRadius: "50%",
                background: isPast
                  ? "var(--mantine-color-mint-green-6)"
                  : isCurrent
                  ? "var(--mantine-color-mint-green-6)"
                  : "var(--mantine-color-gray-3)",
                color: isFuture ? "var(--mantine-color-gray-7)" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                transition: "background 200ms ease",
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
                }}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}
