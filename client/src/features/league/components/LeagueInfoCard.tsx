import {
  ActionIcon,
  Card,
  CopyButton,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

interface LeagueInfoCardProps {
  inviteCode: string;
  createdAt: string;
}

export function LeagueInfoCard({ inviteCode, createdAt }: LeagueInfoCardProps) {
  const shareLink = `${globalThis.location.origin}/join/${inviteCode}`;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Title order={4} mb="sm">League info</Title>
      <Stack gap="md">
        <Stack gap={4}>
          <Text size="sm" fw={500}>Invite code</Text>
          <Group gap={4} wrap="nowrap">
            <Text
              ff="monospace"
              size="sm"
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {inviteCode}
            </Text>
            <CopyButton value={inviteCode}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied" : "Copy"}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color={copied ? "teal" : "gray"}
                    onClick={copy}
                    aria-label="Copy invite code"
                  >
                    {copied ? "✓" : "⎘"}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>
        <Stack gap={4}>
          <Text size="sm" fw={500}>Share link</Text>
          <Group gap={4} wrap="nowrap">
            <Text
              ff="monospace"
              size="xs"
              c="dimmed"
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {shareLink}
            </Text>
            <CopyButton value={shareLink}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied" : "Copy"}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color={copied ? "teal" : "gray"}
                    onClick={copy}
                    aria-label="Copy invite link"
                  >
                    {copied ? "✓" : "⎘"}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" fw={500}>Created</Text>
          <Text size="sm" c="dimmed">
            {new Date(createdAt).toLocaleDateString()}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
