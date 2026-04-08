import { Card, Container, MantineProvider, Text, Title } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import "@mantine/core/styles.css";
import { queryClient, trpc, trpcClient } from "./trpc";

function HealthCard() {
  const health = trpc.health.check.useQuery();

  if (health.isLoading) return <Text>Loading...</Text>;
  if (health.error) return <Text c="red">Error: {health.error.message}</Text>;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text fw={500}>Health Check</Text>
      <Text size="sm" c="dimmed">Status: {health.data?.status}</Text>
      <Text size="sm" c="dimmed">Timestamp: {health.data?.timestamp}</Text>
    </Card>
  );
}

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <Container size="sm" py="xl">
            <Title order={1} mb="lg">Draftr</Title>
            <HealthCard />
          </Container>
        </MantineProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
