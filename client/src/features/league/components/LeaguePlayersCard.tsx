import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconChevronDown, IconTrash } from "@tabler/icons-react";
import { npcStrategyColor, parseNpcStrategy } from "@make-the-pick/shared";
import { NpcAvatar } from "../NpcAvatar";

interface LeaguePlayer {
  id: string;
  userId: string;
  name: string;
  image: string | null;
  role: string;
  isNpc?: boolean;
  npcStrategy?: string | null;
}

interface LeaguePlayersCardProps {
  leagueId: string;
  leagueStatus: string;
  maxPlayers?: number | null;
  players: LeaguePlayer[];
  isCommissioner: boolean;
  atMaxPlayers: boolean;
  addNpcPending: boolean;
  onAddRandomNpc: () => void;
  onOpenChooseNpc: () => void;
  onRemovePlayer: (player: { userId: string; name: string }) => void;
}

export function LeaguePlayersCard({
  leagueStatus,
  maxPlayers,
  players,
  isCommissioner,
  atMaxPlayers,
  addNpcPending,
  onAddRandomNpc,
  onOpenChooseNpc,
  onRemovePlayer,
}: LeaguePlayersCardProps) {
  const title = leagueStatus === "setup"
    ? "Who's in"
    : leagueStatus === "drafting"
    ? "Players"
    : "Standings";

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={3}>{title}</Title>
        {maxPlayers && (
          <Text size="sm" c="dimmed">
            {players.length} / {maxPlayers}
          </Text>
        )}
      </Group>
      <Stack gap="sm">
        {players.map((player) => {
          const strategy = parseNpcStrategy(player.npcStrategy ?? null);
          const hasMetaBadges = player.isNpc || !!strategy;
          return (
            <Stack key={player.id} gap={4}>
              <Group
                justify="space-between"
                wrap="nowrap"
                align="center"
              >
                <Group
                  gap="xs"
                  wrap="nowrap"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {player.isNpc
                    ? (
                      <NpcAvatar
                        name={player.name}
                        image={player.image}
                        radius="xl"
                        size="sm"
                      />
                    )
                    : (
                      <Avatar
                        src={player.image}
                        alt={player.name}
                        radius="xl"
                        size="sm"
                        color="mint-green"
                      >
                        {player.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </Avatar>
                    )}
                  <Text size="sm" style={{ minWidth: 0 }} truncate>
                    {player.name}
                  </Text>
                </Group>
                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Badge variant="light" size="sm" tt="capitalize">
                    {player.role}
                  </Badge>
                  {isCommissioner &&
                    leagueStatus === "setup" &&
                    player.role !== "commissioner" && (
                    <Tooltip label={`Remove ${player.name}`}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label={`Remove ${player.name}`}
                        onClick={() =>
                          onRemovePlayer({
                            userId: player.userId,
                            name: player.name,
                          })}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Group>
              {hasMetaBadges && (
                <Group gap="xs" wrap="wrap" pl={34}>
                  {player.isNpc && (
                    <Badge variant="light" color="grape" size="xs">
                      NPC
                    </Badge>
                  )}
                  {strategy && (
                    <Tooltip label={strategy.description}>
                      <Badge
                        variant="outline"
                        color={npcStrategyColor(strategy)}
                        size="xs"
                      >
                        {strategy.label}
                      </Badge>
                    </Tooltip>
                  )}
                </Group>
              )}
            </Stack>
          );
        })}
        {players.length === 0 && (
          <Text c="dimmed" size="sm">
            No players yet.
          </Text>
        )}
        {isCommissioner && leagueStatus === "setup" && (
          <Group gap={0} wrap="nowrap">
            <Button
              variant="light"
              size="xs"
              loading={addNpcPending}
              disabled={atMaxPlayers}
              onClick={onAddRandomNpc}
              style={{
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
              }}
            >
              + Add random NPC
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="light"
                  size={30}
                  aria-label="More NPC options"
                  style={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderLeft: "1px solid var(--mantine-color-default-border)",
                  }}
                >
                  <IconChevronDown size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={onOpenChooseNpc}>
                  Choose specific NPC…
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
