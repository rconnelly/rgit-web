import { File, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { api } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import type { Blob, RepoInfo, Tree } from "@/lib/types";

export function TreePage() {
  const { owner = "", name = "", ref: paramRef, "*": splat } = useParams();
  const { info } = useOutletContext<{ info: RepoInfo }>();
  const gitRef = paramRef || info.default_branch || "HEAD";
  const path = splat ?? "";
  const [tree, setTree] = useState<Tree | null>(null);
  const [readme, setReadme] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ ref: gitRef });
    if (path) params.set("path", path);
    api<Tree>(`/api/repos/${owner}/${name}/tree?${params}`)
      .then(async (data) => {
        setTree(data);
        const readmeEntry = data.entries.find((e) => /^readme(\.md)?$/i.test(e.name) && e.kind === "blob");
        if (readmeEntry && !path) {
          const file = await api<Blob>(
            `/api/repos/${owner}/${name}/blob?ref=${encodeURIComponent(gitRef)}&path=${encodeURIComponent(readmeEntry.name)}`,
          );
          setReadme(file);
        } else {
          setReadme(null);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load tree"));
  }, [owner, name, gitRef, path]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!tree) return <p className="text-muted-foreground">Loading…</p>;

  const crumbs = path ? path.split("/").filter(Boolean) : [];

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm">
        <Link to={`/${owner}/${name}`} className="hover:underline">
          {name}
        </Link>
        {crumbs.map((part, i) => {
          const href = `/${owner}/${name}/tree/${gitRef}/${crumbs.slice(0, i + 1).join("/")}`;
          return (
            <span key={href}>
              {" / "}
              <Link to={href} className="hover:underline">
                {part}
              </Link>
            </span>
          );
        })}
        <span className="ml-2 font-mono text-xs">{gitRef.slice(0, 12)}</span>
      </p>
      <ul className="divide-border divide-y rounded-xl border bg-card">
        {path ? (
          <li>
            <Link
              className="text-muted-foreground block px-4 py-2 hover:bg-accent/50"
              to={
                crumbs.length <= 1
                  ? `/${owner}/${name}`
                  : `/${owner}/${name}/tree/${gitRef}/${crumbs.slice(0, -1).join("/")}`
              }
            >
              ..
            </Link>
          </li>
        ) : null}
        {tree.entries.map((entry) => {
          const next = path ? `${path}/${entry.name}` : entry.name;
          const to =
            entry.kind === "tree"
              ? `/${owner}/${name}/tree/${gitRef}/${next}`
              : `/${owner}/${name}/blob/${gitRef}/${next}`;
          return (
            <li key={entry.name}>
              <Link to={to} className="flex items-center gap-2 px-4 py-2 hover:bg-accent/50">
                {entry.kind === "tree" ? <Folder className="size-4" /> : <File className="size-4" />}
                <span>{entry.name}</span>
                {entry.size != null && entry.kind === "blob" ? (
                  <span className="text-muted-foreground ml-auto text-xs">{entry.size} B</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {readme?.content ? (
        <article
          className="markdown-body rounded-xl border bg-card p-6"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(readme.content) }}
        />
      ) : readme?.content === "" ? null : path ? null : (
        tree.entries.some((e) => e.kind === "blob") ? (
          <CodeHint owner={owner} name={name} gitRef={gitRef} />
        ) : null
      )}
    </div>
  );
}

function CodeHint({ owner, name, gitRef }: { owner: string; name: string; gitRef: string }) {
  return (
    <p className="text-muted-foreground text-sm">
      Open a file to view source, or visit{" "}
      <Link className="underline" to={`/${owner}/${name}/commits/${gitRef}`}>
        commits
      </Link>
      .
    </p>
  );
}
