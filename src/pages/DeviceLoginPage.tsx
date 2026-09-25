import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { loginPath } from "@/lib/redirect";

interface DeviceShow {
  user_code: string;
  hostname: string;
  fingerprint: string;
  status: string;
  expires_at: string;
}

export function DeviceLoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = params.get("code")?.trim() ?? "";
  const [code, setCode] = useState(preset);
  const [device, setDevice] = useState<DeviceShow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const next = `/login/device${preset ? `?code=${encodeURIComponent(preset)}` : ""}`;

  useEffect(() => {
    if (!user || !preset) return;
    let cancelled = false;
    setPending(true);
    api<DeviceShow>(`/api/auth/device/${encodeURIComponent(preset)}`)
      .then((data) => {
        if (!cancelled) setDevice(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Device not found");
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, preset]);

  if (loading) {
    return <div className="text-muted-foreground p-8">Loading…</div>;
  }

  if (!user) {
    return <Navigate to={loginPath(next)} replace />;
  }

  async function loadCode(event: FormEvent) {
    event.preventDefault();
    const value = code.trim();
    if (!value) return;
    navigate(`/login/device?code=${encodeURIComponent(value)}`);
  }

  async function decide(action: "approve" | "deny") {
    if (!device) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/auth/device/${action}`, {
        method: "POST",
        body: JSON.stringify({ user_code: device.user_code }),
      });
      setDone(action === "approve" ? "Authorized. You can return to the terminal." : "Denied. The CLI will stop waiting.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Authorize CLI sign-in</CardTitle>
          <CardDescription>
            Confirm this one-time code from <code className="text-foreground">rgit login</code>. Approving attaches that
            machine&apos;s SSH public key to {user.user}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!preset ? (
            <form className="flex flex-col gap-4" onSubmit={loadCode}>
              <div className="grid gap-2">
                <Label htmlFor="code">One-time code</Label>
                <Input
                  id="code"
                  autoComplete="off"
                  placeholder="ABCD-EFGH"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <Button type="submit">Continue</Button>
            </form>
          ) : done ? (
            <p className="text-sm">{done}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {device ? (
                <>
                  <p className="font-mono text-2xl tracking-widest">{device.user_code}</p>
                  <dl className="text-muted-foreground grid gap-1 text-sm">
                    <div>
                      <dt className="inline font-medium text-foreground">Host </dt>
                      <dd className="inline">{device.hostname}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-foreground">Key </dt>
                      <dd className="inline break-all font-mono text-xs">{device.fingerprint}</dd>
                    </div>
                  </dl>
                  {device.status !== "pending" ? (
                    <p className="text-sm">This code is {device.status}.</p>
                  ) : (
                    <div className="flex gap-2">
                      <Button disabled={pending} onClick={() => void decide("approve")}>
                        {pending ? "Working…" : "Authorize"}
                      </Button>
                      <Button variant="outline" disabled={pending} onClick={() => void decide("deny")}>
                        Deny
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">{pending ? "Looking up code…" : "Enter a valid code."}</p>
              )}
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
              <p className="text-muted-foreground text-sm">
                Wrong account?{" "}
                <Link to={loginPath(next)} className="underline">
                  Sign in as someone else
                </Link>
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
