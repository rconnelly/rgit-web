import { Link, NavLink, useNavigate } from "react-router";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import logo from "../../logo.svg";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("rgit-theme", next ? "dark" : "light");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src={logo} alt="" className="size-7 rounded-full" />
            Rgit
          </Link>
          <nav className="text-muted-foreground flex items-center gap-3 text-sm">
            <NavLink to="/" className={({ isActive }) => (isActive ? "text-foreground" : "")}>
              Repositories
            </NavLink>
            <a href="https://docs.rgit.rs" className="hover:text-foreground">
              Docs
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {dark ? <Sun /> : <Moon />}
            </Button>
            {user ? (
              <>
                <span className="text-muted-foreground hidden text-sm sm:inline">{user.user}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t">
        <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-4 text-center text-sm">© 2026 Rabun Git</p>
      </footer>
    </div>
  );
}
