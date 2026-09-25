import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { loginPath, safeNext } from "@/lib/redirect";

export function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [invite, setInvite] = useState(() => params.get("invite") ?? "");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ enabled: boolean }>("/api/auth/signup")
      .then((data) => setEnabled(data.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (user) {
    navigate(next, { replace: true });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await signup(name.trim(), password, invite.trim());
      navigate(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign up failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Create an rgit account</CardTitle>
          <CardDescription>
            {enabled === false
              ? "Sign-up is closed until an operator sets an invite code."
              : "Invite code required. No email. SSH clone still uses a key on port 2222."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enabled === false ? (
            <p className="text-muted-foreground text-sm">
              Already have a login?{" "}
              <Link to={loginPath(params.get("next"))} className="underline">
                Sign in
              </Link>
              .
            </p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="invite">Invite code</Label>
                <Input
                  id="invite"
                  autoComplete="off"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user">User</Label>
                <Input
                  id="user"
                  autoComplete="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <p className="text-muted-foreground text-xs">Letters, numbers, dot, underscore, hyphen.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
              <Button type="submit" disabled={pending || enabled === null}>
                {pending ? "Creating account…" : "Create account"}
              </Button>
              <p className="text-muted-foreground text-sm">
                Already have a login?{" "}
                <Link to={loginPath(params.get("next"))} className="underline">
                  Sign in
                </Link>
                .
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
