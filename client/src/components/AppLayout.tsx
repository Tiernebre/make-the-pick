import {
  AppShell,
  Avatar,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { signOut, useSession } from "../auth";

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
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
