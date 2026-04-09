import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import "@mantine/core/styles.css";
import { queryClient, trpc, trpcClient } from "./trpc";
import { AuthGuard } from "./components/AuthGuard";
import { LoginPage } from "./pages/LoginPage";
import { LeagueDetailPage, LeagueListPage } from "./features/league/mod";

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider defaultColorScheme="auto">
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route path="/leagues/:id">
              <AuthGuard>
                <LeagueDetailPage />
              </AuthGuard>
            </Route>
            <Route>
              <AuthGuard>
                <LeagueListPage />
              </AuthGuard>
            </Route>
          </Switch>
        </MantineProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
