import { Alert, Anchor, Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useJoinLeague } from "./use-leagues";

export function JoinLeaguePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [, navigate] = useLocation();
  const joinLeague = useJoinLeague();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    joinLeague.mutate(
      { inviteCode },
      {
        onSuccess: (league) => {
          navigate(`/leagues/${league.id}`);
        },
      },
    );
  }, [inviteCode]);

  if (joinLeague.isError) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Alert color="red" title="Could not join league">
            {joinLeague.error.message}
          </Alert>
          <Anchor href="/">Go home</Anchor>
        </Stack>
      </Center>
    );
  }

  return (
    <Center h="100vh">
      <Stack align="center">
        <Loader />
        <Text>Joining league...</Text>
      </Stack>
    </Center>
  );
}
