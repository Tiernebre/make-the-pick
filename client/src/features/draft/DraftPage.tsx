import {
  Anchor,
  Avatar,
  Badge,
  Container,
  Group,
  LoadingOverlay,
  Table,
  Text,
  Title,
} from "@mantine/core";
import type { DraftPoolItem } from "@make-the-pick/shared";
import { Link, useParams } from "wouter";
import { useLeague } from "../league/use-leagues";
import { useDraftPool } from "./use-draft";

function getBaseStats(item: DraftPoolItem) {
  if (!item.metadata) return null;
  return item.metadata.baseStats;
}

function getStatTotal(item: DraftPoolItem): number | null {
  const stats = getBaseStats(item);
  if (!stats) return null;
  return (
    stats.hp +
    stats.attack +
    stats.defense +
    stats.specialAttack +
    stats.specialDefense +
    stats.speed
  );
}

export function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const draftPool = useDraftPool(id!);

  const isLoading = league.isLoading || draftPool.isLoading;

  return (
    <Container size="xl" py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Anchor component={Link} href={`/leagues/${id}`} mb="md" display="block">
        &larr; Back to League
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            {league.data.name} — Draft
          </Title>

          {draftPool.data && (
            <>
              <Title order={3} mb="sm">
                Draft Pool ({draftPool.data.items.length} items)
              </Title>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th />
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th ta="center">HP</Table.Th>
                    <Table.Th ta="center">ATK</Table.Th>
                    <Table.Th ta="center">DEF</Table.Th>
                    <Table.Th ta="center">SPA</Table.Th>
                    <Table.Th ta="center">SPD</Table.Th>
                    <Table.Th ta="center">SPE</Table.Th>
                    <Table.Th ta="center">Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {draftPool.data.items.map((item) => {
                    const stats = getBaseStats(item);
                    const total = getStatTotal(item);
                    return (
                      <Table.Tr key={item.id}>
                        <Table.Td w={48}>
                          <Avatar
                            src={item.thumbnailUrl}
                            alt={item.name}
                            size="sm"
                            radius="sm"
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} tt="capitalize">
                            {item.name}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {item.metadata && (
                            <Group gap={4}>
                              {item.metadata.types.map((type) => (
                                <Badge key={type} size="xs" variant="light">
                                  {type}
                                </Badge>
                              ))}
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td ta="center">
                          {stats?.hp ?? "—"}
                        </Table.Td>
                        <Table.Td ta="center">
                          {stats?.attack ?? "—"}
                        </Table.Td>
                        <Table.Td ta="center">
                          {stats?.defense ?? "—"}
                        </Table.Td>
                        <Table.Td ta="center">
                          {stats?.specialAttack ?? "—"}
                        </Table.Td>
                        <Table.Td ta="center">
                          {stats?.specialDefense ?? "—"}
                        </Table.Td>
                        <Table.Td ta="center">
                          {stats?.speed ?? "—"}
                        </Table.Td>
                        <Table.Td ta="center" fw={600}>
                          {total ?? "—"}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </>
          )}
        </>
      )}
    </Container>
  );
}
