import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Container,
  Group,
  HoverCard,
  List,
  LoadingOverlay,
  Paper,
  Popover,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { WatchlistPanel } from "./WatchlistPanel";
import { PoolItemNoteIcon } from "./PoolItemNoteIcon";
import {
  IconChevronDown,
  IconInfoCircle,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import type {
  DraftPoolItem,
  PokemonEncounterSummary,
  PokemonEvolution,
  PoolItemAvailability,
  PoolItemEffort,
} from "@make-the-pick/shared";
import { getPoolItemDisplay, getPoolItemStatTotal } from "./pool-item-display";
import { Link, useParams } from "wouter";
import { useSession } from "../../auth";
import {
  useAdvanceLeagueStatus,
  useLeague,
  useLeaguePlayers,
} from "../league/use-leagues";
import { useDraftPool, useRevealNextPoolItem } from "./use-draft";
import { useDraftEvents } from "./use-draft-events";
import { usePoolItemNotes } from "./use-pool-item-notes";
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from "./use-watchlist";
import { useMemo } from "react";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

const POKEMON_TYPE_COLORS: Record<string, string> = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

// Back-compat wrapper so existing call sites keep working while the table
// migrates to the shared `getPoolItemDisplay` helper.
function getStatTotal(item: DraftPoolItem): number | null {
  return getPoolItemStatTotal(item);
}

const ALL_POKEMON_TYPES = Object.keys(POKEMON_TYPE_COLORS);

const AVAILABILITY_META: Record<
  PoolItemAvailability,
  { label: string; color: string; order: number }
> = {
  early: { label: "Early", color: "teal", order: 0 },
  mid: { label: "Mid", color: "yellow", order: 1 },
  late: { label: "Late", color: "red", order: 2 },
};

const AVAILABILITY_FILTER_OPTIONS = (
  ["early", "mid", "late"] as PoolItemAvailability[]
).map((value) => ({
  value,
  label: AVAILABILITY_META[value].label,
}));

function EffortMeter({ effort }: { effort: PoolItemEffort | null }) {
  if (!effort) return <span style={{ color: "#999" }}>—</span>;
  const score = effort.score;
  const color = score <= 2 ? "teal" : score <= 3 ? "yellow" : "red";
  return (
    <HoverCard width={260} position="top" withArrow>
      <HoverCard.Target>
        <UnstyledButton aria-label={`Effort ${score} of 5`}>
          <Group gap={3}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: i <= score
                    ? `var(--mantine-color-${color}-6)`
                    : "var(--mantine-color-gray-3)",
                }}
              />
            ))}
          </Group>
        </UnstyledButton>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text size="sm" fw={600} mb="xs">
          Effort to field: {score}/5
        </Text>
        <List size="xs" spacing={2}>
          {effort.reasons.map((reason) => (
            <List.Item key={reason}>{reason}</List.Item>
          ))}
        </List>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function LocationCell(
  { encounter }: {
    encounter:
      | {
        primary: { location: string; method: string } | null;
        all: PokemonEncounterSummary[];
        source?: { pokemonId: number; name: string };
      }
      | null;
  },
) {
  if (!encounter || !encounter.primary || encounter.all.length === 0) {
    return <span style={{ color: "#999" }}>—</span>;
  }
  const primary = encounter.primary;
  const source = encounter.source;
  return (
    <Popover width={340} position="right" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton
          style={{
            fontSize: 13,
            textAlign: "left",
            cursor: "pointer",
            color: "var(--mantine-color-blue-7)",
          }}
        >
          <Text span size="sm" fw={500} lh={1.2}>
            {primary.location}
          </Text>
          <br />
          <Text span size="xs" c="dimmed">
            {source ? `${primary.method} (as ${source.name})` : primary.method}
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm" fw={600} mb="xs">
          {source
            ? `Encounters for pre-evolution ${source.name}`
            : "All encounters"}
        </Text>
        <Table fz="xs" verticalSpacing={4} highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Location</Table.Th>
              <Table.Th>Method</Table.Th>
              <Table.Th>Level</Table.Th>
              <Table.Th>%</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {encounter.all.map((e, i) => (
              <Table.Tr key={`${e.location}-${e.method}-${i}`}>
                <Table.Td>{e.location}</Table.Td>
                <Table.Td>{e.method}</Table.Td>
                <Table.Td>
                  {e.minLevel === e.maxLevel
                    ? e.minLevel
                    : `${e.minLevel}-${e.maxLevel}`}
                </Table.Td>
                <Table.Td>{e.chance}%</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Popover.Dropdown>
    </Popover>
  );
}

function formatEvolutionTrigger(
  trigger: PokemonEvolution["triggers"][number],
): string {
  if (trigger.trigger === "level-up") {
    const parts: string[] = [];
    if (trigger.minLevel !== null) parts.push(`Level ${trigger.minLevel}`);
    if (trigger.minHappiness !== null) {
      parts.push(`happiness ≥ ${trigger.minHappiness}`);
    }
    if (trigger.timeOfDay) parts.push(`at ${trigger.timeOfDay}`);
    if (trigger.knownMove) parts.push(`knowing ${trigger.knownMove}`);
    if (trigger.location) parts.push(`at ${trigger.location}`);
    if (trigger.heldItem) parts.push(`holding ${trigger.heldItem}`);
    if (trigger.needsOverworldRain) parts.push("during rain");
    return parts.length > 0 ? parts.join(", ") : "Level up";
  }
  if (trigger.trigger === "trade") {
    if (trigger.heldItem) return `Trade holding ${trigger.heldItem}`;
    if (trigger.tradeSpecies) {
      return `Trade for ${trigger.tradeSpecies}`;
    }
    return "Trade";
  }
  if (trigger.trigger === "use-item" && trigger.item) {
    return `Use ${trigger.item}`;
  }
  return trigger.trigger.replace(/-/g, " ");
}

function EvolutionCell({
  evolution,
}: {
  evolution: PokemonEvolution | null;
}) {
  if (!evolution) return <span style={{ color: "#999" }}>—</span>;
  const isStandalone = evolution.evolvesFromId === null &&
    evolution.triggers.length === 0;
  if (isStandalone) {
    return <Text size="xs" c="dimmed">None</Text>;
  }
  return (
    <HoverCard width={280} position="left" withArrow>
      <HoverCard.Target>
        <UnstyledButton
          style={{
            fontSize: 12,
            color: "var(--mantine-color-blue-7)",
          }}
        >
          {evolution.evolvesFromId ? "Evolves" : "Base form"}
        </UnstyledButton>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Stack gap={6}>
          <Text size="sm" fw={600}>Evolution</Text>
          {evolution.evolvesFromId && (
            <Text size="xs">Evolves from #{evolution.evolvesFromId}</Text>
          )}
          {evolution.triggers.length > 0
            ? (
              <List size="xs" spacing={2}>
                {evolution.triggers.map((trigger, idx) => (
                  <List.Item key={idx}>
                    {formatEvolutionTrigger(trigger)}
                  </List.Item>
                ))}
              </List>
            )
            : <Text size="xs" c="dimmed">Does not evolve further.</Text>}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

export function DraftPoolPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const draftPool = useDraftPool(id!);
  const watchlist = useWatchlist(id!);
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const players = useLeaguePlayers(id!);
  const { data: session } = useSession();
  const revealNext = useRevealNextPoolItem(id!);
  const advanceStatus = useAdvanceLeagueStatus();

  const isPooling = league.data?.status === "pooling";
  const isCommissioner = players.data?.some(
    (p) => p.userId === session?.user?.id && p.role === "commissioner",
  ) ?? false;

  // Keep the SSE connection live whenever we're in the pooling showcase so
  // reveal events invalidate the pool query in real time. Outside of
  // pooling the page doesn't need the event stream — the draft page has its
  // own connection.
  useDraftEvents(id!, { enabled: isPooling });

  const poolItemNotes = usePoolItemNotes(id!);

  const watchlistedIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of watchlist.data ?? []) {
      set.add(item.draftPoolItemId);
    }
    return set;
  }, [watchlist.data]);

  const notesByItemId = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of poolItemNotes.data ?? []) {
      map.set(note.draftPoolItemId, note.content);
    }
    return map;
  }, [poolItemNotes.data]);

  const isLoading = league.isLoading || draftPool.isLoading;

  const columns = useMemo<MRT_ColumnDef<DraftPoolItem>[]>(
    () => [
      {
        id: "watchlist",
        header: "",
        size: 50,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        Cell: ({ row }) => {
          const isWatchlisted = watchlistedIds.has(row.original.id);
          return (
            <ActionIcon
              variant="subtle"
              color={isWatchlisted ? "yellow" : "gray"}
              onClick={() => {
                if (isWatchlisted) {
                  removeFromWatchlist.mutate({
                    leagueId: id!,
                    draftPoolItemId: row.original.id,
                  });
                } else {
                  addToWatchlist.mutate({
                    leagueId: id!,
                    draftPoolItemId: row.original.id,
                  });
                }
              }}
            >
              {isWatchlisted
                ? <IconStarFilled size={18} />
                : <IconStar size={18} />}
            </ActionIcon>
          );
        },
      },
      {
        id: "note",
        header: "",
        size: 50,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        Cell: ({ row }) => (
          <PoolItemNoteIcon
            leagueId={id!}
            draftPoolItemId={row.original.id}
            existingContent={notesByItemId.get(row.original.id)}
          />
        ),
      },
      {
        accessorKey: "thumbnailUrl",
        header: "",
        size: 60,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <Avatar
            src={row.original.thumbnailUrl}
            alt={row.original.name}
            size="md"
            radius="sm"
          />
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        Cell: ({ renderedCellValue }) => (
          <span style={{ fontWeight: 500, textTransform: "capitalize" }}>
            {renderedCellValue}
          </span>
        ),
      },
      {
        id: "types",
        accessorFn: (row) => getPoolItemDisplay(row)?.types.join(", ") ?? "",
        header: "Type",
        filterVariant: "multi-select",
        mantineFilterMultiSelectProps: {
          data: ALL_POKEMON_TYPES.map((type) => ({
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
          })),
        },
        filterFn: (row, _columnId, filterValues: string[]) => {
          if (!filterValues || filterValues.length === 0) return true;
          const types = getPoolItemDisplay(row.original)?.types ?? [];
          return filterValues.some((filter) => types.includes(filter));
        },
        Cell: ({ row }) => {
          const display = getPoolItemDisplay(row.original);
          if (!display) return null;
          return (
            <Group gap={4}>
              {display.types.map((type) => (
                <Badge
                  key={type}
                  size="md"
                  variant="light"
                  color={POKEMON_TYPE_COLORS[type] ?? "gray"}
                  tt="capitalize"
                >
                  {type}
                </Badge>
              ))}
            </Group>
          );
        },
      },
      {
        id: "availability",
        accessorFn: (row) => row.availability,
        header: "Availability",
        grow: false,
        filterVariant: "multi-select",
        mantineFilterMultiSelectProps: {
          data: AVAILABILITY_FILTER_OPTIONS,
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.availability;
          const b = rowB.original.availability;
          const aOrder = a
            ? AVAILABILITY_META[a].order
            : Number.MAX_SAFE_INTEGER;
          const bOrder = b
            ? AVAILABILITY_META[b].order
            : Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        },
        filterFn: (row, _columnId, filterValues: string[]) => {
          if (!filterValues || filterValues.length === 0) return true;
          const value = row.original.availability;
          return value !== null && filterValues.includes(value);
        },
        Cell: ({ row }) => {
          const value = row.original.availability;
          if (!value) return <span style={{ color: "#999" }}>—</span>;
          const meta = AVAILABILITY_META[value];
          return (
            <Badge size="md" variant="light" color={meta.color}>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        id: "location",
        accessorFn: (row) => row.encounter?.primary?.location ?? null,
        header: "Found At",
        enableSorting: true,
        enableColumnFilter: false,
        size: 160,
        Cell: ({ row }) => <LocationCell encounter={row.original.encounter} />,
      },
      {
        id: "effort",
        accessorFn: (row) => row.effort?.score ?? null,
        header: "Effort",
        grow: false,
        size: 140,
        filterVariant: "range",
        Header: () => (
          <Group gap={4} wrap="nowrap">
            <span>Effort</span>
            <Tooltip
              label="How much work it takes to field this Pokémon — catching difficulty, how rare it is in the wild, and any evolution requirements (level, trade, items). 1 = easy, 5 = hard."
              multiline
              w={260}
              withArrow
              position="top"
            >
              <IconInfoCircle
                size={14}
                style={{ color: "var(--mantine-color-dimmed)" }}
                aria-label="Effort column info"
              />
            </Tooltip>
          </Group>
        ),
        Cell: ({ row }) => <EffortMeter effort={row.original.effort} />,
      },
      {
        id: "evolution",
        accessorFn: (row) => row.evolution?.evolvesFromId ?? null,
        header: "Evo",
        enableSorting: false,
        enableColumnFilter: false,
        grow: false,
        size: 100,
        Cell: ({ row }) => <EvolutionCell evolution={row.original.evolution} />,
      },
      {
        accessorFn: (row) => getPoolItemDisplay(row)?.baseStats.hp ?? null,
        id: "hp",
        header: "HP",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => getPoolItemDisplay(row)?.baseStats.attack ?? null,
        id: "attack",
        header: "Attack",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => getPoolItemDisplay(row)?.baseStats.defense ?? null,
        id: "defense",
        header: "Defense",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) =>
          getPoolItemDisplay(row)?.baseStats.specialAttack ?? null,
        id: "specialAttack",
        header: "Sp. Atk",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) =>
          getPoolItemDisplay(row)?.baseStats.specialDefense ?? null,
        id: "specialDefense",
        header: "Sp. Def",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => getPoolItemDisplay(row)?.baseStats.speed ?? null,
        id: "speed",
        header: "Speed",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => getStatTotal(row),
        id: "total",
        header: "Total",
        grow: false,
        filterVariant: "range",
        Cell: ({ cell }) => (
          <span style={{ fontWeight: 600 }}>
            {cell.getValue<number | null>() ?? "—"}
          </span>
        ),
      },
    ],
    [watchlistedIds, notesByItemId, id, addToWatchlist, removeFromWatchlist],
  );

  const table = useMantineReactTable({
    columns,
    data: draftPool.data?.items ?? [],
    layoutMode: "grid",
    enableColumnResizing: true,
    enableGlobalFilter: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    initialState: {
      density: "xs",
      showColumnFilters: false,
      showGlobalFilter: true,
      sorting: [{ id: "total", desc: true }],
    },
    enablePagination: false,
    state: {
      isLoading,
    },
  });

  return (
    <Container fluid py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Anchor
        component={Link}
        href={`/leagues/${id}`}
        mb="md"
        display="block"
      >
        &larr; Back to League
      </Anchor>

      {league.data && (
        <>
          <Group
            justify="space-between"
            align="center"
            mb="lg"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 3,
              backgroundColor: "var(--mantine-color-body)",
              paddingTop: "var(--mantine-spacing-md)",
              paddingBottom: "var(--mantine-spacing-sm)",
            }}
          >
            <Title order={1}>
              {league.data.name} —{" "}
              {isPooling ? "Pool Reveal Showcase" : "Draft Pool"}
            </Title>
            <Popover
              width={360}
              position="bottom-end"
              withArrow
              shadow="md"
              trapFocus
            >
              <Popover.Target>
                <Button
                  variant="default"
                  rightSection={<IconChevronDown size={16} />}
                >
                  Watchlist ({watchlist.data?.length ?? 0})
                </Button>
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <WatchlistPanel
                  leagueId={id!}
                  poolItems={draftPool.data?.items ?? []}
                />
              </Popover.Dropdown>
            </Popover>
          </Group>

          {isPooling && (
            <Paper
              withBorder
              radius="md"
              p="md"
              mb="lg"
              style={{
                background: "var(--mantine-color-mint-green-0)",
                borderColor: "var(--mantine-color-mint-green-4)",
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap">
                <Stack gap={4} style={{ flex: 1, minWidth: 240 }}>
                  <Group gap="sm" align="center">
                    <Text fw={700} size="md" c="mint-green-9">
                      Live pool reveal in progress
                    </Text>
                    <Badge color="mint-green" variant="filled" size="lg">
                      {draftPool.data?.items.length ?? 0} /{" "}
                      {draftPool.data?.totalItems ?? 0} revealed
                    </Badge>
                  </Group>
                  <Text size="sm" c="dark.6">
                    {isCommissioner
                      ? "Reveal Pokémon one at a time for everyone watching. The showcase finishes automatically when the last one is revealed."
                      : "Waiting on the commissioner to reveal the next Pokémon. The rest are hidden until then."}
                  </Text>
                </Stack>
                {isCommissioner && (
                  <Group gap="sm">
                    <Button
                      size="md"
                      variant="outline"
                      color="mint-green.9"
                      loading={advanceStatus.isPending}
                      onClick={() => advanceStatus.mutate({ leagueId: id! })}
                    >
                      Skip showcase
                    </Button>
                    <Button
                      size="md"
                      color="mint-green"
                      loading={revealNext.isPending}
                      onClick={() => revealNext.mutate({ leagueId: id! })}
                    >
                      Reveal next Pokémon
                    </Button>
                  </Group>
                )}
              </Group>
              {revealNext.error && (
                <Alert color="red" title="Reveal failed" mt="sm">
                  {revealNext.error.message}
                </Alert>
              )}
            </Paper>
          )}

          <MantineReactTable table={table} />
        </>
      )}
    </Container>
  );
}
