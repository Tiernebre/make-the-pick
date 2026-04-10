import { Button, Modal, Stack, Text, Title } from "@mantine/core";
import { useResumeDraft } from "./use-draft-commissioner";

export interface PausedOverlayProps {
  status: string;
  isCommissioner: boolean;
  leagueId: string;
}

export function PausedOverlay(
  { status, isCommissioner, leagueId }: PausedOverlayProps,
) {
  const resume = useResumeDraft(leagueId);
  if (status !== "paused") return null;

  return (
    <Modal
      opened
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      size="md"
      transitionProps={{ duration: 0 }}
      title={null}
    >
      <Stack gap="md" align="center" py="md">
        <Title order={2}>Draft Paused</Title>
        <Text c="dimmed" ta="center">
          The commissioner has paused the draft. Waiting to resume…
        </Text>
        {isCommissioner && (
          <Button
            onClick={() => resume.mutate({ leagueId })}
            loading={resume.isPending}
          >
            Resume Draft
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
