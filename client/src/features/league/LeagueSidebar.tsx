import {
  Badge,
  Box,
  Divider,
  Group,
  NavLink,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconChartBar,
  IconChecklist,
  IconLayoutDashboard,
  IconSettings,
  IconSwords,
  IconTelescope,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { useSession } from "../../auth";
import { useLeague, useLeaguePlayers } from "./use-leagues";

interface LeagueSidebarProps {
  leagueId: string;
  location: string;
  collapsed: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  setup: "gray",
  drafting: "mint-green",
  competing: "blue",
  complete: "violet",
};

export function parseLeagueId(location: string): string | null {
  const match = location.match(/^\/leagues\/([^/]+)(?:\/.*)?$/);
  if (!match) return null;
  const id = match[1];
  if (id === "new" || id === "join") return null;
  return id;
}

export function LeagueSidebar(
  { leagueId, location, collapsed }: LeagueSidebarProps,
) {
  const league = useLeague(leagueId);
  const players = useLeaguePlayers(leagueId);
  const { data: session } = useSession();

  const isCommissioner = players.data?.some(
    (p) => p.userId === session?.user?.id && p.role === "commissioner",
  ) ?? false;

  const status = league.data?.status ?? "setup";
  const draftEnabled = status !== "setup";
  const name = league.data?.name ?? "League";

  const overviewHref = `/leagues/${leagueId}`;
  const draftHref = `/leagues/${leagueId}/draft`;
  const poolHref = `/leagues/${leagueId}/draft/pool`;
  const settingsHref = `/leagues/${leagueId}/settings`;

  const isOverviewActive = location === overviewHref;
  const isDraftActive = location === draftHref;
  const isPoolActive = location === poolHref;
  const isSettingsActive = location === settingsHref;

  return (
    <Stack gap={0}>
      <Box px={collapsed ? "xs" : "md"} pt="xs" pb="sm">
        <NavLink
          component={Link}
          href="/leagues"
          leftSection={<IconArrowLeft size={16} />}
          label={collapsed ? undefined : "All leagues"}
          aria-label="All leagues"
          variant="subtle"
          c="dimmed"
        />
        {!collapsed && (
          <Group gap="xs" px="sm" pt="xs" wrap="nowrap">
            <Text fw={700} size="sm" truncate>
              {name}
            </Text>
            <Badge
              size="xs"
              variant="light"
              color={STATUS_COLOR[status] ?? "gray"}
              style={{ flexShrink: 0 }}
            >
              {status}
            </Badge>
          </Group>
        )}
      </Box>
      <Divider />

      <Stack gap={2} py="xs">
        <LeagueNavItem
          to={overviewHref}
          label="Overview"
          icon={<IconLayoutDashboard size={20} />}
          active={isOverviewActive}
          collapsed={collapsed}
        />
        <LeagueNavItem
          to={draftEnabled ? draftHref : undefined}
          label="Draft Room"
          icon={<IconSwords size={20} />}
          active={isDraftActive}
          collapsed={collapsed}
          disabled={!draftEnabled}
          tooltip={!draftEnabled ? "Draft hasn't started" : undefined}
        />
        <LeagueNavItem
          to={draftEnabled ? poolHref : undefined}
          label="Draft Pool"
          icon={<IconTelescope size={20} />}
          active={isPoolActive}
          collapsed={collapsed}
          disabled={!draftEnabled}
          tooltip={!draftEnabled ? "Draft hasn't started" : undefined}
        />
        <LeagueNavItem
          label="Standings"
          icon={<IconChartBar size={20} />}
          collapsed={collapsed}
          disabled
          badge="Soon"
        />
        <LeagueNavItem
          label="Picks"
          icon={<IconChecklist size={20} />}
          collapsed={collapsed}
          disabled
          badge="Soon"
        />
        {isCommissioner && (
          <LeagueNavItem
            to={settingsHref}
            label="Settings"
            icon={<IconSettings size={20} />}
            active={isSettingsActive}
            collapsed={collapsed}
          />
        )}
      </Stack>
    </Stack>
  );
}

interface LeagueNavItemProps {
  to?: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  collapsed: boolean;
  disabled?: boolean;
  badge?: string;
  tooltip?: string;
}

function LeagueNavItem(
  {
    to,
    label,
    icon,
    active,
    collapsed,
    disabled,
    badge,
    tooltip,
  }: LeagueNavItemProps,
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
  const tooltipLabel = tooltip ?? (collapsed ? label : undefined);
  if (tooltipLabel) {
    return (
      <Tooltip label={tooltipLabel} position="right">
        <div>{link}</div>
      </Tooltip>
    );
  }
  return link;
}
