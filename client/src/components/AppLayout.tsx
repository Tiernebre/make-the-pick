import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBinoculars,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconTrophy,
  IconUser,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { signOut, useSession } from "../auth";
import { useLeagues } from "../features/league/use-leagues";
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
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [leaguesOpened, { toggle: toggleLeagues }] = useDisclosure(true);

  const leagues = useLeagues();
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

  const isLeaguesActive = location.startsWith("/leagues");
  const leagueItems = leagues.data ?? [];

  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{
        width: navbarWidth,
        breakpoint: "sm",
        collapsed: { mobile: true, desktop: false },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
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
                  <Text fw={800} size="lg" ta="center">
                    M
                  </Text>
                </Tooltip>
              )
              : (
                <Text fw={800} size="lg">
                  Make the Pick
                </Text>
              )}
          </Box>
          <Divider />

          <ScrollArea style={{ flex: 1 }}>
            <Stack gap={2} py="xs">
              <SidebarLink
                to="/"
                label="Home"
                icon={<IconHome size={20} />}
                active={location === "/"}
                collapsed={collapsed}
              />

              {collapsed
                ? (
                  <Tooltip label="Leagues" position="right">
                    <div>
                      <SidebarLink
                        to="/leagues"
                        label="Leagues"
                        icon={<IconTrophy size={20} />}
                        active={isLeaguesActive}
                        collapsed
                      />
                    </div>
                  </Tooltip>
                )
                : (
                  <NavLink
                    label="Leagues"
                    leftSection={<IconTrophy size={20} />}
                    childrenOffset={28}
                    opened={leaguesOpened}
                    onClick={toggleLeagues}
                    active={isLeaguesActive}
                    variant="filled"
                  >
                    {leagueItems.map((league) => (
                      <NavLink
                        key={league.id}
                        component={Link}
                        href={`/leagues/${league.id}`}
                        label={league.name}
                        active={location === `/leagues/${league.id}`}
                        variant="light"
                      />
                    ))}
                    <NavLink
                      component={Link}
                      href="/leagues"
                      label="Browse all"
                      c="dimmed"
                    />
                  </NavLink>
                )}

              <SidebarLink
                label="Research"
                icon={<IconBinoculars size={20} />}
                collapsed={collapsed}
                disabled
                badge="Soon"
              />

              <SidebarLink
                label="Profile"
                icon={<IconUser size={20} />}
                collapsed={collapsed}
                disabled
                badge="Soon"
              />
            </Stack>
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

interface SidebarLinkProps {
  to?: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  collapsed: boolean;
  disabled?: boolean;
  badge?: string;
}

function SidebarLink(
  { to, label, icon, active, collapsed, disabled, badge }: SidebarLinkProps,
) {
  const link = (
    <NavLink
      component={disabled || !to ? "button" : Link}
      href={to}
      label={collapsed ? undefined : label}
      leftSection={icon}
      active={active}
      disabled={disabled}
      rightSection={!collapsed && badge
        ? (
          <Badge size="xs" variant="light" color="gray">
            {badge}
          </Badge>
        )
        : undefined}
      variant="filled"
      aria-label={label}
    />
  );
  if (collapsed) {
    return (
      <Tooltip label={label} position="right">
        <div>{link}</div>
      </Tooltip>
    );
  }
  return link;
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
