import { AppShell } from "@/components/shell/AppShell";
import { AuthShell } from "@/components/shell/AuthShell";
import { ErrorBoundary } from "@/components/shell/ErrorBoundary";
import { RouterProvider, usePath } from "@/lib/router";
import { ThemeProvider } from "@/lib/theme";
import { matchRoute, NotFoundPage } from "@/pages/routes";

function Outlet() {
  const path = usePath();
  const matched = matchRoute(path);

  if (!matched) {
    return (
      <AppShell>
        <NotFoundPage />
      </AppShell>
    );
  }

  const { route } = matched;
  const Page = route.Component;
  const page = (
    <ErrorBoundary key={path}>
      <Page />
    </ErrorBoundary>
  );

  if (route.shell === "auth") {
    return <AuthShell>{page}</AuthShell>;
  }

  return <AppShell>{page}</AppShell>;
}

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <Outlet />
      </RouterProvider>
    </ThemeProvider>
  );
}
