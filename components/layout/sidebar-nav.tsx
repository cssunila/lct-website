"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  BookOpen,
  Layers,
  Users,
  Gamepad2,
  History,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/tournament", label: "Tournament", icon: Trophy, exact: false },
  { href: "bank-soal", label: "Bank Soal", icon: BookOpen, exact: false, scoped: true },
  { href: "rounds", label: "Babak & Kloter", icon: Layers, exact: false, scoped: true },
  { href: "teams", label: "Tim", icon: Users, exact: false, scoped: true },
  { href: "game", label: "Game", icon: Gamepad2, exact: false, scoped: true },
  { href: "history", label: "History", icon: History, exact: false, scoped: true },
] as const;

interface SidebarNavProps {
  collapsed: boolean;
}

export default function SidebarNav({ collapsed }: SidebarNavProps) {
  const pathname = usePathname();

  const tidMatch = pathname.match(/\/tournament\/([^/]+)/);
  const tid = tidMatch ? tidMatch[1] : null;

  return (
    <>
      <div className={cn(
        "flex items-center gap-3 py-5",
        collapsed ? "justify-center px-2" : "px-5"
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Swords className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">LCT-K System</p>
            <p className="text-[11px] text-muted-foreground truncate">Competition Manager</p>
          </div>
        )}
      </div>

      <nav className={cn(
        "flex-1 space-y-1 overflow-y-auto pb-4",
        collapsed ? "px-2" : "px-3"
      )}>
        {navItems.map((item) => {
          let href: string;
          if ("scoped" in item && item.scoped && tid) {
            href = `/tournament/${tid}/${item.href}`;
          } else if ("scoped" in item && item.scoped) {
            href = "#";
          } else {
            href = item.href;
          }

          const isActive = "exact" in item && item.exact
            ? pathname === item.href
            : pathname.startsWith(href) && href !== "#";

          const isDisabled = href === "#";

          return (
            <Link
              key={item.label}
              href={href}
              aria-disabled={isDisabled}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                collapsed ? "justify-center px-2" : "px-3",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isDisabled
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-border px-5 py-3">
          <p className="text-[11px] text-muted-foreground">LCT-K System</p>
        </div>
      )}
    </>
  );
}
