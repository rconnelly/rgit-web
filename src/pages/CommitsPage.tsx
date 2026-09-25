import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { api } from "@/lib/api";
import type { Log, RepoInfo } from "@/lib/types";

export function CommitsPage() {
  const { owner = "", name = "", ref: gitRef } = useParams();
  const { info } = useOutletContext<{ info: RepoInfo }>();
  const resolvedRef = gitRef || info.default_branch || "HEAD";
  const [log, setLog] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Log>(`/api/repos/${owner}/${name}/log?ref=${encodeURIComponent(resolvedRef)}&limit=50`)
      .then(setLog)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load commits"));
  }, [owner, name, resolvedRef]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!log) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <ul className="divide-border divide-y rounded-xl border bg-card">
      {log.commits.map((commit) => (
        <li key={commit.sha} className="px-4 py-3">
          <Link className="font-medium hover:underline" to={`/${owner}/${name}/commit/${commit.sha}`}>
            {commit.subject}
          </Link>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="font-mono">{commit.short}</span> · {commit.author} · {commit.date}
          </p>
        </li>
      ))}
    </ul>
  );
}
