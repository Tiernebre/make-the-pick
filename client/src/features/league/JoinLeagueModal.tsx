import { Button, Modal, TextInput } from "@mantine/core";
import { type FormEvent, useState } from "react";
import { useJoinLeague } from "./use-leagues";

interface JoinLeagueModalProps {
  opened: boolean;
  onClose: () => void;
}

export function JoinLeagueModal({ opened, onClose }: JoinLeagueModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const joinLeague = useJoinLeague();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      setError("Invite code is required");
      return;
    }
    setError("");
    joinLeague.mutate(
      { inviteCode: trimmed },
      {
        onSuccess: () => {
          setInviteCode("");
          setError("");
          onClose();
        },
      },
    );
  };

  const handleClose = () => {
    setInviteCode("");
    setError("");
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Join League">
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Invite Code"
          placeholder="Enter invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.currentTarget.value)}
          error={error}
        />
        <Button
          type="submit"
          mt="md"
          fullWidth
          loading={joinLeague.isPending}
        >
          {joinLeague.isPending ? "Joining..." : "Join"}
        </Button>
      </form>
    </Modal>
  );
}
