import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { BlamePage } from "@/pages/BlamePage";
import { BlobPage } from "@/pages/BlobPage";
import { CommitPage } from "@/pages/CommitPage";
import { CommitsPage } from "@/pages/CommitsPage";
import { HomePage } from "@/pages/HomePage";
import { DeviceLoginPage } from "@/pages/DeviceLoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { RepoLayout } from "@/pages/RepoLayout";
import { RequestPage } from "@/pages/RequestPage";
import { RequestsPage } from "@/pages/RequestsPage";
import { TreePage } from "@/pages/TreePage";

export function App() {
  const { loading } = useAuth();
  if (loading) {
    return <div className="text-muted-foreground p-8">Loading…</div>;
  }
  return (
    <AppShell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/device" element={<DeviceLoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/:owner/:name" element={<RepoLayout />}>
          <Route index element={<TreePage />} />
          <Route path="tree/:ref/*" element={<TreePage />} />
          <Route path="blob/:ref/*" element={<BlobPage />} />
          <Route path="blame/:ref/*" element={<BlamePage />} />
          <Route path="commits" element={<CommitsPage />} />
          <Route path="commits/:ref" element={<CommitsPage />} />
          <Route path="commit/:sha" element={<CommitPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/:id" element={<RequestPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
