import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { CodeView } from "@/components/code/CodeView";
import { api } from "@/lib/api";
import type { Blame, RepoInfo } from "@/lib/types";

export function BlamePage() {
  const { owner = "", name = "", ref: gitRef = "HEAD", "*": splat } = useParams();
  const { info } = useOutletContext<{ info: RepoInfo }>();
  const path = splat ?? "";
  const resolvedRef = gitRef || info.default_branch || "HEAD";
  const [blame, setBlame] = useState<Blame | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Blame>(
      `/api/repos/${owner}/${name}/blame?ref=${encodeURIComponent(resolvedRef)}&path=${encodeURIComponent(path)}`,
    )
      .then(setBlame)
      .catch((err) => setError(err instanceof Error ? err.message : "Blame failed"));
  }, [owner, name, resolvedRef, path]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!blame) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-4">
      <p className="font-mono text-sm">
        <Link className="hover:underline" to={`/${owner}/${name}/blob/${resolvedRef}/${path}`}>
          {path}
        </Link>{" "}
        blame
      </p>
      <CodeView lines={blame.lines.map((l) => l.text)} blame={blame.lines} commitBase={`/${owner}/${name}/commit`} />
    </div>
  );
}
