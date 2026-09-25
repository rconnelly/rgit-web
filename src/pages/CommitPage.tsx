import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "@/lib/api";
import type { CommitInfo } from "@/lib/types";

export function CommitPage() {
  const { owner = "", name = "", sha = "" } = useParams();
  const [commit, setCommit] = useState<CommitInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CommitInfo>(`/api/repos/${owner}/${name}/commit/${sha}`)
      .then(setCommit)
      .catch((err) => setError(err instanceof Error ? err.message : "Commit not found"));
  }, [owner, name, sha]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!commit) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        <Link to={`/${owner}/${name}/commits`} className="hover:underline">
          Commits
        </Link>
      </p>
      <h2 className="text-2xl">{commit.subject}</h2>
      <p className="text-muted-foreground text-sm">
        {commit.author} &lt;{commit.email}&gt; · {commit.date}
      </p>
      <p className="font-mono text-sm">{commit.sha}</p>
      {commit.body ? <pre className="bg-code rounded-lg border p-4 whitespace-pre-wrap">{commit.body}</pre> : null}
    </div>
  );
}
