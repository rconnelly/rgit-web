import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { GitFork, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RepoInfo, SessionUser } from "@/lib/types";
import { WelcomeEmpty } from "@/pages/WelcomeEmpty";

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repos, setRepos] = useState<RepoInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api<{ repos: RepoInfo[] }>("/api/repos")
      .then((data) => setRepos(data.repos ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not list repositories"));
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api("/api/repos", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), public: isPublic }),
      });
      navigate(`/${name.trim()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create repository");
    } finally {
      setCreating(false);
    }
  }

  if (repos === null && !error) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const createCard = user ? (
    <CreateRepoCard
      user={user}
      name={name}
      isPublic={isPublic}
      creating={creating}
      onName={setName}
      onPublic={setIsPublic}
      onCreate={onCreate}
    />
  ) : null;

  if ((repos?.length ?? 0) === 0) {
    return (
      <WelcomeEmpty user={user} error={error}>
        {createCard}
      </WelcomeEmpty>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.12em] uppercase">Forge</p>
        <h1 className="mb-4 text-3xl">Repositories</h1>
        {error ? <p className="text-destructive mb-4 text-sm">{error}</p> : null}
        <ul className="divide-border divide-y rounded-xl border bg-card">
          {repos!.map((repo) => (
            <li key={repo.name}>
              <Link to={`/${repo.name}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50">
                <span className="flex items-center gap-2 font-medium">
                  <GitFork className="size-4" />
                  {repo.name}
                </span>
                <Badge variant={repo.visibility === "public" ? "gold" : "outline"}>{repo.visibility}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {createCard}
    </div>
  );
}

function CreateRepoCard({
  user,
  name,
  isPublic,
  creating,
  onName,
  onPublic,
  onCreate,
}: {
  user: SessionUser;
  name: string;
  isPublic: boolean;
  creating: boolean;
  onName: (value: string) => void;
  onPublic: (value: boolean) => void;
  onCreate: (event: FormEvent) => void;
}) {
  return (
    <Card id="new-repo" className="lg:max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-4" /> New repository
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={onCreate}>
          <div className="grid gap-2">
            <Label htmlFor="name">owner/name</Label>
            <Input id="name" placeholder={`${user.user}/app`} value={name} onChange={(e) => onName(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => onPublic(e.target.checked)} />
            Public
          </label>
          <Button type="submit" disabled={creating || !name.includes("/")}>
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
