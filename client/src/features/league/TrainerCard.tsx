import { Avatar, Badge, Box, Group, Stack, Text } from "@mantine/core";
import { IconIdBadge2 } from "@tabler/icons-react";

interface TrainerCardProps {
  name: string | null;
  image?: string | null;
  role?: string;
  subtitle?: string;
}

function initialsOf(name: string | null): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Distinctive "trainer card" styled panel for the player's identity in a
 * league. Uses a gradient border + mint-green accent to evoke a Pokemon
 * trainer ID without being cartoonish.
 */
export function TrainerCard(
  { name, image, role, subtitle }: TrainerCardProps,
) {
  return (
    <Box
      data-testid="trainer-card"
      p={2}
      style={{
        borderRadius: 14,
        background:
          "linear-gradient(135deg, var(--mantine-color-mint-green-6), var(--mantine-color-mint-green-3))",
      }}
    >
      <Box
        p="md"
        style={{
          borderRadius: 12,
          background: "var(--mantine-color-body)",
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <Avatar
              src={image ?? undefined}
              alt={name ?? "trainer"}
              radius="md"
              size="lg"
              color="mint-green"
              style={{
                border: "2px solid var(--mantine-color-mint-green-6)",
              }}
            >
              {initialsOf(name)}
            </Avatar>
            <Stack gap={2}>
              <Text fw={700} size="lg" lh={1.1}>
                {name ?? "Unclaimed"}
              </Text>
              {subtitle && (
                <Text size="xs" c="dimmed">
                  {subtitle}
                </Text>
              )}
              {role && (
                <Badge
                  size="xs"
                  variant="light"
                  color="mint-green"
                  tt="capitalize"
                  mt={4}
                >
                  {role}
                </Badge>
              )}
            </Stack>
          </Group>
          <Box c="mint-green">
            <IconIdBadge2 size={22} />
          </Box>
        </Group>
      </Box>
    </Box>
  );
}
