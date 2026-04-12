import { trpc } from "../../trpc";

export function useLeagues() {
  return trpc.league.list.useQuery();
}

export function useLeague(id: string) {
  return trpc.league.getById.useQuery({ id });
}

export function useLeaguePlayers(leagueId: string) {
  return trpc.league.listPlayers.useQuery({ leagueId });
}

export function useCreateLeague() {
  const utils = trpc.useUtils();
  return trpc.league.create.useMutation({
    onSuccess: () => {
      utils.league.list.invalidate();
    },
  });
}

export function useJoinLeague() {
  const utils = trpc.useUtils();
  return trpc.league.join.useMutation({
    onSuccess: () => {
      utils.league.list.invalidate();
    },
  });
}

export function useUpdateLeagueSettings() {
  const utils = trpc.useUtils();
  return trpc.league.updateSettings.useMutation({
    onSuccess: (_data, variables) => {
      utils.league.getById.invalidate({ id: variables.leagueId });
    },
  });
}

export function useAdvanceLeagueStatus() {
  const utils = trpc.useUtils();
  return trpc.league.advanceStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.league.getById.invalidate({ id: variables.leagueId });
      utils.league.list.invalidate();
    },
  });
}

export function useAddNpcPlayer() {
  const utils = trpc.useUtils();
  return trpc.league.addNpcPlayer.useMutation({
    onSuccess: (_data, variables) => {
      utils.league.listPlayers.invalidate({ leagueId: variables.leagueId });
      utils.league.listAvailableNpcs.invalidate({
        leagueId: variables.leagueId,
      });
    },
  });
}

export function useAvailableNpcs(leagueId: string, enabled: boolean) {
  return trpc.league.listAvailableNpcs.useQuery(
    { leagueId },
    { enabled },
  );
}

export function useRemoveLeaguePlayer() {
  const utils = trpc.useUtils();
  return trpc.league.removePlayer.useMutation({
    onSuccess: (_data, variables) => {
      utils.league.listPlayers.invalidate({ leagueId: variables.leagueId });
      utils.league.listAvailableNpcs.invalidate({
        leagueId: variables.leagueId,
      });
    },
  });
}

export function useLeaveLeague() {
  const utils = trpc.useUtils();
  return trpc.league.leave.useMutation({
    onSuccess: () => {
      utils.league.list.invalidate();
    },
  });
}

export function useDeleteLeague() {
  const utils = trpc.useUtils();
  return trpc.league.delete.useMutation({
    onSuccess: () => {
      utils.league.list.invalidate();
    },
  });
}
