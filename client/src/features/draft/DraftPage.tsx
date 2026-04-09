import {
  Anchor,
  Avatar,
  Badge,
  Card,
  Container,
  Group,
  LoadingOverlay,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link, useParams } from "wouter";
import { useLeague } from "../league/use-leagues";
import { useDraftPool } from "./use-draft";

export function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const draftPool = useDraftPool(id!);

  const isLoading = league.isLoading || draftPool.isLoading;

  return (
    <Container size="md" py="xl" pos="relative">
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
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                {draftPool.data.items.map((item) => (
                  <Card
                    key={item.id}
                    shadow="sm"
                    padding="sm"
                    radius="md"
                    withBorder
                  >
                    <Stack align="center" gap="xs">
                      <Avatar
                        src={item.thumbnailUrl}
                        alt={item.name}
                        size="lg"
                        radius="sm"
                      />
                      <Text size="sm" fw={500} ta="center">
                        {item.name}
                      </Text>
                      {item.metadata &&
                        typeof item.metadata === "object" &&
                        "types" in item.metadata &&
                        Array.isArray(item.metadata.types) && (
                        <Group gap={4}>
                          {item.metadata.types.map((type: string) => (
                            <Badge key={type} size="xs" variant="light">
                              {type}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </>
          )}
        </>
      )}
    </Container>
  );
}
