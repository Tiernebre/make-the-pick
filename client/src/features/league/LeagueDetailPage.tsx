import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  CopyButton,
  Group,
  LoadingOverlay,
  Modal,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useLocation, useParams } from "wouter";
import { useSession } from "../../auth";
import { useDeleteLeague, useLeague } from "./use-leagues";

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const { data: session } = useSession();
  const deleteLeague = useDeleteLeague();
  const [, navigate] = useLocation();
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);

  const isCreator = league.data?.createdBy === session?.user?.id;

  const handleDelete = () => {
    deleteLeague.mutate(
      { id: id! },
      {
        onSuccess: () => {
          navigate("/");
        },
      },
    );
  };

  return (
    <Container size="sm" py="xl" pos="relative">
      <LoadingOverlay visible={league.isLoading} />

      <Anchor component={Link} href="/" mb="md" display="block">
        &larr; Back to Leagues
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            {league.data.name}
          </Title>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group mb="sm">
              <Text fw={500}>Status</Text>
              <Badge variant="light">{league.data.status}</Badge>
            </Group>

            <Group mb="sm">
              <Text fw={500}>Invite Code</Text>
              <Group gap="xs">
                <Text ff="monospace">{league.data.inviteCode}</Text>
                <CopyButton value={league.data.inviteCode}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Copied" : "Copy"}>
                      <ActionIcon
                        variant="subtle"
                        color={copied ? "teal" : "gray"}
                        onClick={copy}
                      >
                        {copied ? "✓" : "⎘"}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Group>

            <Group>
              <Text fw={500}>Created</Text>
              <Text c="dimmed">
                {new Date(league.data.createdAt).toLocaleDateString()}
              </Text>
            </Group>
          </Card>

          {isCreator && (
            <Button
              color="red"
              variant="light"
              mt="lg"
              onClick={openDelete}
            >
              Delete League
            </Button>
          )}

          <Modal
            opened={deleteOpened}
            onClose={closeDelete}
            title="Delete League"
          >
            <Text mb="lg">
              Are you sure you want to delete{" "}
              <Text span fw={700}>
                {league.data.name}
              </Text>
              ? This action cannot be undone.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDelete}>
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleDelete}
                loading={deleteLeague.isPending}
              >
                Delete
              </Button>
            </Group>
          </Modal>
        </>
      )}
    </Container>
  );
}
