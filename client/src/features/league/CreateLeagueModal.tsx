import { Button, Modal, TextInput } from "@mantine/core";
import { type FormEvent, useState } from "react";
import { useCreateLeague } from "./use-leagues";

interface CreateLeagueModalProps {
  opened: boolean;
  onClose: () => void;
}

export function CreateLeagueModal({ opened, onClose }: CreateLeagueModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const createLeague = useCreateLeague();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (trimmed.length > 100) {
      setError("Name must be 100 characters or less");
      return;
    }
    setError("");
    createLeague.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName("");
          setError("");
          onClose();
        },
      },
    );
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create League">
      <form onSubmit={handleSubmit}>
        <TextInput
          label="League Name"
          placeholder="Enter league name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={error}
          maxLength={100}
        />
        <Button
          type="submit"
          mt="md"
          fullWidth
          loading={createLeague.isPending}
        >
          {createLeague.isPending ? "Creating..." : "Create"}
        </Button>
      </form>
    </Modal>
  );
}
