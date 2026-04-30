import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { canViewAllBrigades } from "@/lib/rbac";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { name, role } = session.user;
  const roleLabel = { FOREMAN: "Бригадир", ADMIN: "Администратор", DIRECTOR: "Директор" }[role];
  const isAdmin = canViewAllBrigades(role);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 h-14">
          <div className="flex items-center gap-7">
            <Link href="/timesheet" className="text-[15px] font-semibold tracking-tight text-foreground hover:text-primary transition-colors">Табель</Link>
            <nav className="flex items-center gap-0.5">
              {isAdmin && <NavLink href="/admin">Меню</NavLink>}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {name}
              <span className="mx-1.5 text-border">·</span>
              {roleLabel}
            </span>
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-7">{children}</main>
    </div>
  );
}
