import { auth } from "@/auth";
import { assertRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { NavLink } from "@/components/nav-link";

const NAV = [
  { href: "/admin/objects", label: "Объекты" },
  { href: "/admin/positions", label: "Должности" },
  { href: "/admin/departments", label: "Подразделения" },
  { href: "/admin/employees", label: "Сотрудники" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/backups", label: "Резервные копии" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    assertRole(session.user.role, ["ADMIN", "DIRECTOR"]);
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="flex gap-8">
      <nav className="w-44 shrink-0 pt-0.5">
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Меню
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
