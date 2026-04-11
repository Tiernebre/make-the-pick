import { ActionIcon, Box, Group, Text } from "@mantine/core";
import type { Ceremony } from "./use-draft-ceremony";

export interface CeremonyTickerProps {
  current: Ceremony | null;
  onDismiss: () => void;
}

// ESPN "BREAKING NEWS" red — picked to read as alarm/urgency at a glance
// without veering into Mantine's standard error palette.
const BREAKING_RED = "#c8102e";
const BREAKING_RED_DARK = "#8a0a1f";

export function CeremonyTicker(
  { current, onDismiss }: CeremonyTickerProps,
) {
  if (!current) return null;

  return (
    <Box
      role="alert"
      aria-live="polite"
      pos="fixed"
      top={0}
      left={0}
      right={0}
      style={{
        zIndex: 1000,
        backgroundColor: BREAKING_RED,
        color: "white",
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        borderBottom: `2px solid ${BREAKING_RED_DARK}`,
        animation: "ceremonyTickerSlideIn 320ms ease-out",
      }}
    >
      <style>
        {`
          @keyframes ceremonyTickerSlideIn {
            from { transform: translateY(-100%); }
            to   { transform: translateY(0); }
          }
          @keyframes ceremonyTickerPulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.55; }
          }
        `}
      </style>
      <Group gap={0} wrap="nowrap" px="md" py="xs" align="center">
        <Box
          px="md"
          py={6}
          style={{
            backgroundColor: "white",
            color: BREAKING_RED,
            fontWeight: 900,
            letterSpacing: "0.12em",
            fontSize: "0.85rem",
            textTransform: "uppercase",
            animation: "ceremonyTickerPulse 1.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        >
          ● Breaking
        </Box>
        <Box pl="md" style={{ flexGrow: 1, minWidth: 0 }}>
          <Group gap="sm" wrap="nowrap" align="baseline">
            <Text
              fw={900}
              size="md"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              The Pick Is In:
            </Text>
            <Text
              fw={700}
              size="md"
              style={{ whiteSpace: "nowrap" }}
            >
              {current.playerName}
            </Text>
            <Text size="sm" opacity={0.85} style={{ whiteSpace: "nowrap" }}>
              selects
            </Text>
            <Text
              fw={900}
              size="lg"
              tt="capitalize"
              style={{ whiteSpace: "nowrap" }}
            >
              {current.pokemonName}
            </Text>
            <Text
              size="xs"
              opacity={0.75}
              style={{
                marginLeft: "auto",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Round {current.round} · Pick {current.pickNumber + 1}
            </Text>
          </Group>
        </Box>
        <ActionIcon
          variant="transparent"
          color="white"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{ color: "white", flexShrink: 0, marginLeft: 8 }}
        >
          ×
        </ActionIcon>
      </Group>
    </Box>
  );
}
