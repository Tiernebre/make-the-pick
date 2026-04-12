import { Button, Card, Stack, Switch, Text } from "@mantine/core";
import { useState } from "react";

export interface CeremonySettingsProps {
  isMuted: boolean;
  isFastMode: boolean;
  onToggleMute: () => void;
  onToggleFastMode?: (enabled: boolean) => void;
}

// A self-contained settings panel anyone in the draft room can pop open to
// silence the jingle or skip ceremonies entirely. Implemented as a plain
// toggle-revealed card rather than a Mantine Popover because Popover
// portals out of the test render container, making the controls
// untestable without DOM gymnastics.
export function CeremonySettings(
  { isMuted, isFastMode, onToggleMute, onToggleFastMode }:
    CeremonySettingsProps,
) {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="xs" align="flex-end">
      <Button
        size="xs"
        variant="subtle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Ceremony
      </Button>
      {open && (
        <Card withBorder shadow="sm" padding="sm" radius="md" w={260}>
          <Stack gap="sm">
            <Text size="sm" fw={600}>Pick ceremony</Text>
            <Switch
              label="Sound"
              description="Play the draft jingle on each pick"
              checked={!isMuted}
              onChange={onToggleMute}
            />
            {onToggleFastMode && (
              <Switch
                label="Fast mode"
                description="Skip ceremonies and NPC thinking delay"
                checked={isFastMode}
                onChange={(e) => onToggleFastMode(e.currentTarget.checked)}
              />
            )}
            {!onToggleFastMode && isFastMode && (
              <Text size="xs" c="dimmed">
                Fast mode enabled by commissioner
              </Text>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
