import { Container, MantineProvider, Title } from "@mantine/core";
import "@mantine/core/styles.css";

export function App() {
  return (
    <MantineProvider>
      <Container size="sm" py="xl">
        <Title order={1}>Draftr</Title>
      </Container>
    </MantineProvider>
  );
}
