import {
  createTheme,
  type MantineColorsTuple,
  MantineProvider,
} from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "mantine-react-table/styles.css";
import { queryClient, trpc, trpcClient } from "./trpc";

const mintGreen: MantineColorsTuple = [
  "#e6fff2",
  "#d0f5e3",
  "#a3e8c5",
  "#72dca5",
  "#4ad18a",
  "#31ca78",
  "#21c76e",
  "#10b05c",
  "#009d50",
  "#008842",
];

const theme = createTheme({
  primaryColor: "mint-green",
  colors: {
    "mint-green": mintGreen,
  },
});
import { AuthGuard } from "./components/AuthGuard";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import {
  CreateLeaguePage,
  JoinLeaguePage,
  LeagueDetailPage,
  LeagueListPage,
  LeagueSettingsPage,
} from "./features/league/mod";
import { DraftPage, DraftPoolPage } from "./features/draft/mod";

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route path="/join/:inviteCode">
              <AuthGuard>
                <JoinLeaguePage />
              </AuthGuard>
            </Route>
            <Route path="/leagues/new">
              <AuthGuard>
                <AppLayout>
                  <CreateLeaguePage />
                </AppLayout>
              </AuthGuard>
            </Route>
            <Route path="/leagues/:id/draft/pool">
              <AuthGuard>
                <AppLayout>
                  <DraftPoolPage />
                </AppLayout>
              </AuthGuard>
            </Route>
            <Route path="/leagues/:id/draft">
              <AuthGuard>
                <AppLayout>
                  <DraftPage />
                </AppLayout>
              </AuthGuard>
            </Route>
            <Route path="/leagues/:id/settings">
              <AuthGuard>
                <AppLayout>
                  <LeagueSettingsPage />
                </AppLayout>
              </AuthGuard>
            </Route>
            <Route path="/leagues/:id">
              <AuthGuard>
                <AppLayout>
                  <LeagueDetailPage />
                </AppLayout>
              </AuthGuard>
            </Route>
            <Route>
              <AuthGuard>
                <AppLayout>
                  <LeagueListPage />
                </AppLayout>
              </AuthGuard>
            </Route>
          </Switch>
        </MantineProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
