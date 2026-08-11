import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: "blue" | "green" | "amber" | "purple" | "rose";
}

const colorMap = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function StatCard({ icon: Icon, label, value, color = "blue" }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", colorMap[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-3xl font-bold tabular tracking-tight">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
