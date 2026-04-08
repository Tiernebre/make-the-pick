import { LoadingOverlay } from "@mantine/core";
import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useSession } from "../auth";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, isPending } = useSession();

  if (isPending) return <LoadingOverlay visible />;
  if (!session) return <Redirect to="/login" />;

  return <>{children}</>;
}
