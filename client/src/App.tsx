import {
  Button,
  Card,
  Container,
  Group,
  MantineProvider,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "@mantine/core/styles.css";
import { queryClient, trpc, trpcClient } from "./trpc";
import { useWebSocket } from "./hooks/use-web-socket";

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

function EchoCard() {
  const [input, setInput] = useState("");
  const wsUrl = `ws://${globalThis.location?.host ?? "localhost:3000"}/ws/echo`;
  const { lastMessage, sendMessage } = useWebSocket(wsUrl);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text fw={500}>WebSocket Echo</Text>
      <Group mt="sm">
        <TextInput
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage(input);
              setInput("");
            }
          }}
        />
        <Button
          onClick={() => {
            sendMessage(input);
            setInput("");
          }}
        >
          Send
        </Button>
      </Group>
      {lastMessage && (
        <Text size="sm" c="dimmed" mt="sm">Response: {lastMessage}</Text>
      )}
    </Card>
  );
}

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider defaultColorScheme="auto">
          <Container size="sm" py="xl">
            <Title order={1} mb="lg">Draftr</Title>
            <Stack>
              <HealthCard />
              <EchoCard />
            </Stack>
          </Container>
        </MantineProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
