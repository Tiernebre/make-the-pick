import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { signIn } from "../auth";

export function LoginPage() {
  return (
    <Center h="100vh">
      <Stack align="center" gap="md">
        <Title order={1}>Make The Pick</Title>
        <Text c="dimmed">Sign in to continue</Text>
        <Button
          size="lg"
          onClick={() =>
            signIn.social({ provider: "google", callbackURL: "/" })}
        >
          Sign in with Google
        </Button>
      </Stack>
    </Center>
  );
}
