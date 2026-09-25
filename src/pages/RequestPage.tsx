import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { DiffView } from "@/components/code/CodeView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";
import type { Diff, MergeRequest } from "@/lib/types";

export function RequestPage() {
  const { owner = "", name = "", id = "" } = useParams();
  const { user } = useAuth();
  const [req, setReq] = useState<MergeRequest | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const shown = await api<MergeRequest>(`/api/repos/${owner}/${name}/requests/${id}`);
    setReq(shown);
    const d = await api<Diff>(`/api/repos/${owner}/${name}/requests/${id}/diff`);
    setDiff(d);
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Request not found"));
  }, [owner, name, id]);

  async function review(verdict: "approve" | "reject" | "comment") {
    setError(null);
    try {
      await api(`/api/repos/${owner}/${name}/requests/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ verdict, comment }),
      });
      setComment("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed");
    }
  }

  async function merge() {
    setError(null);
    try {
      await api(`/api/repos/${owner}/${name}/requests/${id}/merge`, { method: "POST" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Merge failed (fast-forward only)");
    }
  }

  if (error && !req) return <p className="text-destructive">{error}</p>;
  if (!req) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm">
        <Link to={`/${owner}/${name}/requests`} className="hover:underline">
          Requests
        </Link>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">
            #{req.id} {req.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {req.head_branch || req.head_sha?.slice(0, 8)} → {req.base_branch} · {req.author}
          </p>
        </div>
        <Badge variant={req.state === "merged" ? "gold" : "outline"}>{req.state}</Badge>
      </div>
      {req.body ? (
        <article
          className="markdown-body rounded-xl border bg-card p-5"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(req.body) }}
        />
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {user && req.state === "open" ? (
        <div className="grid gap-3 rounded-xl border bg-card p-4">
          <Textarea placeholder="Comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => review("comment")} disabled={!comment.trim()}>
              Comment
            </Button>
            <Button variant="secondary" onClick={() => review("approve")}>
              Approve
            </Button>
            <Button variant="destructive" onClick={() => review("reject")}>
              Reject
            </Button>
            <Button onClick={merge}>Merge (fast-forward)</Button>
          </div>
        </div>
      ) : null}
      {req.reviews.length > 0 ? (
        <ul className="grid gap-2">
          {req.reviews.map((review, i) => (
            <li key={i} className="rounded-lg border bg-card px-4 py-2 text-sm">
              <span className="font-medium">{review.author}</span> {review.verdict}
              {review.comment ? ` — ${review.comment}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {diff?.commits.length ? (
        <div>
          <h3 className="mb-2 font-semibold">Commits</h3>
          <ul className="divide-border divide-y rounded-xl border bg-card">
            {diff.commits.map((c) => (
              <li key={c.sha} className="px-4 py-2 text-sm">
                <Link className="font-mono hover:underline" to={`/${owner}/${name}/commit/${c.sha}`}>
                  {c.short}
                </Link>{" "}
                {c.subject}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {diff?.diff ? <DiffView diff={diff.diff} /> : <p className="text-muted-foreground text-sm">No diff.</p>}
    </div>
  );
}
