import {
  AppShell,
  Avatar,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { signOut, useSession } from "../auth";
import { trpc } from "../trpc";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      globalThis.location.replace("/login");
    },
  });

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text
            fw={700}
            size="lg"
            component={Link}
            to="/"
            td="none"
            c="inherit"
          >
            Make the Pick
          </Text>

          {user && (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar
                      src={user.image}
                      alt={user.name}
                      radius="xl"
                      size="sm"
                      color="blue"
                    >
                      {initials}
                    </Avatar>
                    <Text size="sm">{user.name}</Text>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  onClick={() =>
                    signOut({
                      fetchOptions: {
                        onSuccess: () => globalThis.location.replace("/login"),
                      },
                    })}
                >
                  Sign out
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={openDelete}>
                  Delete account
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>

      <Modal
        opened={deleteOpened}
        onClose={closeDelete}
        title="Delete account"
      >
        <Stack>
          <Text>
            Are you sure you want to delete your account? This action is
            permanent and cannot be undone. All your data will be removed.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteAccount.isPending}
              onClick={() => deleteAccount.mutate()}
            >
              Delete account
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}
