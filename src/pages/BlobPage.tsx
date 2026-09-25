import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { CodeView } from "@/components/code/CodeView";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import type { Blob, RepoInfo } from "@/lib/types";

export function BlobPage() {
  const { owner = "", name = "", ref: gitRef = "HEAD", "*": splat } = useParams();
  const { info } = useOutletContext<{ info: RepoInfo }>();
  const path = splat ?? "";
  const resolvedRef = gitRef || info.default_branch || "HEAD";
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Blob>(
      `/api/repos/${owner}/${name}/blob?ref=${encodeURIComponent(resolvedRef)}&path=${encodeURIComponent(path)}`,
    )
      .then(setBlob)
      .catch((err) => setError(err instanceof Error ? err.message : "File not found"));
  }, [owner, name, resolvedRef, path]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!blob) return <p className="text-muted-foreground">Loading…</p>;

  const isMarkdown = /\.(md|markdown)$/i.test(path);
  const lines = (blob.content ?? "").split("\n");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm">
          <Link className="hover:underline" to={`/${owner}/${name}`}>
            {name}
          </Link>
          <span className="text-muted-foreground"> / {path}</span>
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/${owner}/${name}/blame/${resolvedRef}/${path}`}>Blame</Link>
        </Button>
      </div>
      {blob.binary || blob.truncated ? (
        <p className="text-muted-foreground">
          {blob.binary ? "Binary file" : "File too large to display"} ({blob.size} bytes)
        </p>
      ) : isMarkdown && blob.content ? (
        <article
          className="markdown-body rounded-xl border bg-card p-6"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(blob.content) }}
        />
      ) : (
        <CodeView lines={lines} />
      )}
    </div>
  );
}
