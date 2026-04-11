import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { signOut, useSession } from "../auth";
import { LeagueSidebar, parseLeagueId } from "../features/league/LeagueSidebar";
import { trpc } from "../trpc";

interface AppLayoutProps {
  children: ReactNode;
}

const NAVBAR_EXPANDED_WIDTH = 260;
const NAVBAR_COLLAPSED_WIDTH = 72;

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [location] = useLocation();
  const [collapsed, { toggle: toggleCollapsed }] = useDisclosure(false);
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);

  useEffect(() => {
    closeMobile();
  }, [location, closeMobile]);

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      globalThis.location.replace("/login");
    },
  });

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navbarWidth = collapsed
    ? NAVBAR_COLLAPSED_WIDTH
    : NAVBAR_EXPANDED_WIDTH;

  const currentLeagueId = parseLeagueId(location);

  return (
    <AppShell
      header={{ height: 52 }}
      footer={{ height: 40 }}
      navbar={{
        width: navbarWidth,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: false },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="sm">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
            aria-label="Toggle navigation"
          />
          <Text size="sm" c="dimmed">
            {breadcrumbForLocation(location)}
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <Stack gap={0} h="100%">
          <Box px={collapsed ? "xs" : "md"} py="md">
            {collapsed
              ? (
                <Tooltip label="Make the Pick" position="right">
                  <UnstyledButton
                    component={Link}
                    href="/leagues"
                    aria-label="Make the Pick"
                    style={{ display: "block", width: "100%" }}
                  >
                    <Text fw={800} size="lg" ta="center">
                      M
                    </Text>
                  </UnstyledButton>
                </Tooltip>
              )
              : (
                <UnstyledButton
                  component={Link}
                  href="/leagues"
                  aria-label="Make the Pick"
                  style={{ display: "block", width: "100%" }}
                >
                  <Text fw={800} size="lg">
                    Make the Pick
                  </Text>
                </UnstyledButton>
              )}
          </Box>
          <Divider />

          <ScrollArea style={{ flex: 1 }}>
            {currentLeagueId && (
              <LeagueSidebar
                leagueId={currentLeagueId}
                location={location}
                collapsed={collapsed}
              />
            )}
          </ScrollArea>

          <Divider />
          <Box p="xs">
            {user && (
              <Group
                justify={collapsed ? "center" : "space-between"}
                wrap="nowrap"
                gap="xs"
              >
                <Menu
                  shadow="md"
                  width={220}
                  position={collapsed ? "right-end" : "top-start"}
                  withinPortal
                >
                  <Menu.Target>
                    <UnstyledButton
                      aria-label={user.name ?? "Account menu"}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <Avatar
                          src={user.image}
                          alt={user.name}
                          radius="xl"
                          size="sm"
                          color="mint-green"
                          title={user.name}
                        >
                          {initials}
                        </Avatar>
                        {!collapsed && (
                          <Text size="sm" truncate>
                            {user.name}
                          </Text>
                        )}
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      onClick={() =>
                        signOut({
                          fetchOptions: {
                            onSuccess: () =>
                              globalThis.location.replace("/login"),
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

                {!collapsed && (
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    onClick={toggleCollapsed}
                    aria-label="Collapse sidebar"
                  >
                    <IconChevronLeft size={18} />
                  </ActionIcon>
                )}
              </Group>
            )}
            {collapsed && (
              <Box mt="xs" ta="center">
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  onClick={toggleCollapsed}
                  aria-label="Expand sidebar"
                >
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Box>
            )}
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>

      <AppShell.Footer>
        <Group h="100%" px="md" justify="space-between" gap="sm">
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} Make the Pick
          </Text>
          <Text
            component="a"
            href="https://github.com/Tiernebre/make-the-pick"
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="dimmed"
          >
            GitHub
          </Text>
        </Group>
      </AppShell.Footer>

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

function breadcrumbForLocation(location: string): string {
  if (location === "/") return "Home";
  if (location === "/leagues/new") return "Leagues / New";
  const leagueMatch = location.match(/^\/leagues\/([^/]+)(\/.*)?$/);
  if (leagueMatch) {
    const rest = leagueMatch[2] ?? "";
    if (rest === "/draft") return "Leagues / Draft Room";
    if (rest === "/draft/pool") return "Leagues / Draft Pool";
    return "Leagues";
  }
  return "";
}
