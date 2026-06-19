"use client";

import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { METIER_COLORS as METIER_CHART_COLORS } from "@/lib/metiers";
import type { FactionStats } from "@/types";

interface FactionCardProps {
  stats: FactionStats;
  showDetailLink?: boolean;
}

export function FactionCard({
  stats,
  showDetailLink = true,
}: FactionCardProps) {
  const chartData = stats.metierBreakdown.map((m) => ({
    name: m.name,
    value: m.count,
    fill: METIER_CHART_COLORS[m.name] ?? "#6b7280",
  }));
  const singleSlice = chartData.length === 1;
  const total = stats.memberCount || 1;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-4">
        {chartData.length > 0 ? (
          <div className="h-[72px] w-[72px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={34}
                  paddingAngle={singleSlice ? 0 : 2}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, item) => [
                    `${value} membre${value !== 1 ? "s" : ""}`,
                    item.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            —
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold leading-tight">
                {stats.faction.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {stats.memberCount} membre{stats.memberCount !== 1 ? "s" : ""}
              </p>
            </div>
            {showDetailLink && (
              <Link
                href={`/factions/${stats.faction.slug}`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                Voir détail
              </Link>
            )}
          </div>

          {chartData.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {chartData.map((item) => {
                const pct = Math.round((item.value / total) * 100);
                return (
                  <li
                    key={item.name}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.value} ({pct}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Aucun membre</p>
          )}
        </div>
      </div>
    </div>
  );
}
