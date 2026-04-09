import { ActionIcon, Popover, Textarea } from "@mantine/core";
import { IconNote } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  useDeletePoolItemNote,
  useUpsertPoolItemNote,
} from "./use-pool-item-notes";

interface PoolItemNoteIconProps {
  leagueId: string;
  draftPoolItemId: string;
  existingContent: string | undefined;
}

export function PoolItemNoteIcon({
  leagueId,
  draftPoolItemId,
  existingContent,
}: PoolItemNoteIconProps) {
  const [opened, setOpened] = useState(false);
  const [content, setContent] = useState(existingContent ?? "");
  const upsertNote = useUpsertPoolItemNote();
  const deleteNote = useDeletePoolItemNote();

  useEffect(() => {
    setContent(existingContent ?? "");
  }, [existingContent]);

  const handleBlur = useCallback(() => {
    const trimmed = content.trim();
    if (trimmed && trimmed !== existingContent) {
      upsertNote.mutate({ leagueId, draftPoolItemId, content: trimmed });
    } else if (!trimmed && existingContent) {
      deleteNote.mutate({ leagueId, draftPoolItemId });
    }
  }, [
    content,
    existingContent,
    leagueId,
    draftPoolItemId,
    upsertNote,
    deleteNote,
  ]);

  const hasNote = !!existingContent;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={280}
      position="bottom"
      withArrow
      trapFocus
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color={hasNote ? "blue" : "gray"}
          onClick={() => setOpened((o) => !o)}
        >
          <IconNote size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Textarea
          placeholder="Add a note..."
          maxLength={280}
          minRows={2}
          maxRows={4}
          autosize
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          onBlur={handleBlur}
          autoFocus
        />
      </Popover.Dropdown>
    </Popover>
  );
}
