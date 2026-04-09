import {
  Anchor,
  Button,
  Container,
  LoadingOverlay,
  Title,
} from "@mantine/core";
import { Link, useParams } from "wouter";
import { useLeague } from "../league/use-leagues";

export function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);

  return (
    <Container size="xl" py="xl" pos="relative">
      <LoadingOverlay visible={league.isLoading} />

      <Anchor component={Link} href={`/leagues/${id}`} mb="md" display="block">
        &larr; Back to League
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            {league.data.name} — Draft
          </Title>

          <Button
            component={Link}
            href={`/leagues/${id}/draft/pool`}
            variant="light"
          >
            View Draft Pool
          </Button>
        </>
      )}
    </Container>
  );
}
