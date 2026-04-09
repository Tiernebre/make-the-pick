import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import "@mantine/core/styles.css";
import { queryClient, trpc, trpcClient } from "./trpc";
import { AuthGuard } from "./components/AuthGuard";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import {
  JoinLeaguePage,
  LeagueDetailPage,
  LeagueListPage,
} from "./features/league/mod";

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider defaultColorScheme="auto">
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route path="/join/:inviteCode">
              <AuthGuard>
                <JoinLeaguePage />
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
