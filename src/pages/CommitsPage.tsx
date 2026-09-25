import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { api, ApiError } from "@/lib/api";
import type { Log, RepoInfo } from "@/lib/types";
import { EmptyRepo, isUnbornRepoError } from "@/pages/EmptyRepo";

export function CommitsPage() {
  const { owner = "", name = "", ref: gitRef } = useParams();
  const { info } = useOutletContext<{ info: RepoInfo }>();
  const resolvedRef = gitRef || info.default_branch || "HEAD";
  const [log, setLog] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!info.default_branch && !gitRef) {
      setLog({ repo: `${owner}/${name}`, ref: resolvedRef, commits: [] });
      setError(null);
      return;
    }
    api<Log>(`/api/repos/${owner}/${name}/log?ref=${encodeURIComponent(resolvedRef)}&limit=50`)
      .then(setLog)
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Could not load commits";
        if (isUnbornRepoError(message)) {
          setLog({ repo: `${owner}/${name}`, ref: resolvedRef, commits: [] });
          setError(null);
          return;
        }
        setError(message);
      });
  }, [owner, name, resolvedRef, gitRef, info.default_branch]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!log) return <p className="text-muted-foreground">Loading…</p>;
  if (log.commits.length === 0) {
    return <EmptyRepo info={info} />;
  }

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
