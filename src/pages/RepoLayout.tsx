import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RepoInfo } from "@/lib/types";

export function RepoLayout() {
  const { owner = "", name = "" } = useParams();
  const repo = `${owner}/${name}`;
  const { user } = useAuth();
  const [info, setInfo] = useState<RepoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<RepoInfo>(`/api/repos/${owner}/${name}`)
      .then(setInfo)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Repository not found"));
  }, [owner, name]);

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`;

  async function copyClone() {
    if (!info) return;
    await navigator.clipboard.writeText(info.clone_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }
  if (!info) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.12em] uppercase">Repository</p>
          <h1 className="text-3xl">
            <Link to={`/${owner}`} className="hover:underline">
              {owner}
            </Link>
            <span className="text-muted-foreground"> / </span>
            {name}
          </h1>
          {info.description ? <p className="text-muted-foreground mt-1">{info.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={info.visibility === "public" ? "gold" : "outline"}>{info.visibility}</Badge>
          {info.role ? <Badge variant="outline">{info.role}</Badge> : null}
          {user && (info.role === "admin" || user.admin) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const next = info.visibility !== "public";
                const updated = await api<RepoInfo>(`/api/repos/${owner}/${name}/visibility`, {
                  method: "POST",
                  body: JSON.stringify({ public: next }),
                });
                setInfo({ ...info, visibility: updated.visibility ?? (next ? "public" : "private") });
              }}
            >
              Make {info.visibility === "public" ? "private" : "public"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="bg-code rounded-md border px-3 py-1.5 text-sm">{info.clone_url}</code>
        <Button variant="outline" size="sm" onClick={copyClone}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <nav className="flex gap-1 border-b pb-2">
        <NavLink to={`/${repo}`} end className={tab}>
          Code
        </NavLink>
        <NavLink to={`/${repo}/commits`} className={tab}>
          Commits
        </NavLink>
        <NavLink to={`/${repo}/requests`} className={tab}>
          Requests
        </NavLink>
      </nav>
      <Outlet context={{ info }} />
    </div>
  );
}
