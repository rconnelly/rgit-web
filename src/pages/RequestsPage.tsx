import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { MergeRequest, RepoInfo } from "@/lib/types";

export function RequestsPage() {
  const { owner = "", name = "" } = useParams();
  const { info } = useOutletContext<{ info: RepoInfo }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MergeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [head, setHead] = useState("");
  const [base, setBase] = useState(info.default_branch ?? "master");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    api<{ requests: MergeRequest[] }>(`/api/repos/${owner}/${name}/requests`)
      .then((data) => setRequests(data.requests ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not list requests"));
  }, [owner, name]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await api<MergeRequest>(`/api/repos/${owner}/${name}/requests`, {
        method: "POST",
        body: JSON.stringify({ head, base, title, body }),
      });
      navigate(`/${owner}/${name}/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open request");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        {error ? <p className="text-destructive mb-3 text-sm">{error}</p> : null}
        {requests.length === 0 ? (
          <p className="text-muted-foreground">No merge requests.</p>
        ) : (
          <ul className="divide-border divide-y rounded-xl border bg-card">
            {requests.map((req) => (
              <li key={req.id} className="px-4 py-3">
                <Link className="font-medium hover:underline" to={`/${owner}/${name}/requests/${req.id}`}>
                  #{req.id} {req.title}
                </Link>
                <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                  <Badge variant="outline">{req.state}</Badge>
                  {req.head_branch || "(sha)"} → {req.base_branch} · {req.author}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {user ? (
        <Card>
          <CardHeader>
            <CardTitle>Open a request</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={onCreate}>
              <div className="grid gap-2">
                <Label htmlFor="head">Head branch</Label>
                <Input id="head" value={head} onChange={(e) => setHead(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="base">Base</Label>
                <Input id="base" value={base} onChange={(e) => setBase(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
