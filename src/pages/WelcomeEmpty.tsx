import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, FolderTree, GitPullRequest, KeyRound, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import hero from "../assets/welcome-hero.jpg";
import logo from "../logo.svg";

const features = [
  { icon: FolderTree, title: "Browse", copy: "Trees, blobs, blame. Every line attributed." },
  { icon: GitPullRequest, title: "Requests", copy: "Review, approve, merge. One ACL with SSH." },
  { icon: Terminal, title: "Clone", copy: "Keys over SSH. Passwords stay in the browser." },
  { icon: KeyRound, title: "Invite-only", copy: "No email. Public or private, your call." },
];

export function WelcomeEmpty({ user, error, children }: { user: SessionUser | null; error?: string | null; children?: ReactNode }) {
  const [signupOpen, setSignupOpen] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ enabled: boolean }>("/api/auth/signup")
      .then((data) => setSignupOpen(data.enabled))
      .catch(() => setSignupOpen(false));
  }, []);

  return (
    <div className="grid gap-10">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <section className="relative min-h-[22rem] overflow-hidden rounded-2xl border bg-card shadow-sm lg:min-h-[26rem]">
        <img
          src={hero}
          alt="Forest peaks at a gold horizon, reflected in still water."
          className="absolute inset-0 size-full object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-background/92 sm:hidden dark:bg-background/90" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-background/95 via-background/70 to-background/15 sm:block dark:from-background/92 dark:via-background/65" />
        <div className="relative grid gap-10 p-6 sm:p-8 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-center lg:p-10">
          <div className="max-w-xl">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.12em] uppercase">Forge</p>
            <h1 className="text-4xl leading-[1.05] sm:text-5xl">
              {user ? "First repo. Then the work." : "Code. Review. Land."}
            </h1>
            <p className="text-foreground mt-4 max-w-md text-base leading-relaxed">
              {user
                ? "Create a repository. Push over SSH. Review in the browser."
                : "Self-hosted git. Browse, blame, merge. SSH. Invite only. No email."}
            </p>
            {user ? (
              <div className="mt-6">
                <Button size="lg" asChild>
                  <a href="#new-repo">Create a repository</a>
                </Button>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {signupOpen === false ? (
                  <>
                    <Button size="lg" asChild>
                      <Link to="/login">Sign in</Link>
                    </Button>
                    <p className="text-muted-foreground text-sm">Sign-up is closed. Ask an operator for an invite.</p>
                  </>
                ) : (
                  <>
                    <Button size="lg" asChild>
                      <Link to="/signup">Create an account</Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/login">Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="pb-4 pr-1">
            <ForgePreview />
          </div>
        </div>
      </section>

      <a
        href="https://docs.rgit.rs"
        className="group hover:border-gold/60 hover:bg-accent/40 flex items-start gap-4 rounded-2xl border border-gold/35 bg-card px-5 py-5 sm:items-center sm:px-6"
      >
        <img src={logo} alt="" className="size-12 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="text-gold text-xs font-semibold tracking-[0.12em] uppercase">The tool</p>
          <p className="mt-1 text-lg font-semibold">Rgit is Git with etiquette.</p>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
            Self-hosted forge. SSH remotes. Users, keys, merge requests — from the CLI.
          </p>
        </div>
        <ArrowRight className="text-muted-foreground group-hover:text-foreground mt-1 size-5 shrink-0 sm:mt-0" aria-hidden />
      </a>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, copy }) => (
          <li key={title} className="rounded-xl border bg-card p-4">
            <Icon className="text-gold mb-3 size-4" aria-hidden />
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-snug">{copy}</p>
          </li>
        ))}
      </ul>

      {children}
    </div>
  );
}

function ForgePreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="rounded-xl border bg-card/95 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <span className="bg-gold/80 size-1.5 rounded-full" />
          <span className="bg-muted-foreground/35 size-1.5 rounded-full" />
          <span className="bg-muted-foreground/25 size-1.5 rounded-full" />
          <span className="ml-1 text-xs font-medium">acme/ledger</span>
          <Badge variant="gold" className="ml-auto">
            public
          </Badge>
        </div>
        <div className="flex text-[11px] leading-5">
          <div className="text-muted-foreground w-24 shrink-0 border-r px-3 py-2">
            <p>src/</p>
            <p className="text-foreground">auth.ts</p>
            <p>tree.ts</p>
            <p>README.md</p>
          </div>
          <div className="min-w-0 flex-1 px-3 py-2 font-mono">
            <p>
              <span className="text-gold">a1c3</span>
              <span className="text-muted-foreground"> ryan </span>
              <span>fn review()</span>
            </p>
            <p>
              <span className="text-gold">a1c3</span>
              <span className="text-muted-foreground"> ryan </span>
              <span>{"  approve()"}</span>
            </p>
            <p>
              <span className="text-gold">9e2b</span>
              <span className="text-muted-foreground"> ada  </span>
              <span>{"  merge()"}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-1 border-t px-2 py-1.5 text-[11px]">
          <span className="bg-primary text-primary-foreground rounded-md px-2 py-0.5">Code</span>
          <span className="text-muted-foreground rounded-md px-2 py-0.5">Commits</span>
          <span className="text-muted-foreground rounded-md px-2 py-0.5">Requests</span>
        </div>
      </div>

      <div className="absolute right-2 top-14 hidden w-40 rounded-lg border bg-card p-3 shadow-md sm:block">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">Request #12</p>
        <p className="mt-0.5 text-sm font-medium">Tighten ACL</p>
        <div className="mt-2 flex gap-1 text-[10px] font-medium">
          <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5">Approve</span>
          <span className="rounded border px-1.5 py-0.5">Merge</span>
        </div>
      </div>

      <div className="bg-code absolute -bottom-3 left-3 right-6 truncate rounded-md border px-3 py-1.5 font-mono text-[10px]">
        ssh://git@host/acme/ledger
      </div>
    </div>
  );
}
