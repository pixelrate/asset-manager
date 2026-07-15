"use client";

// Dashboard charts (Recharts). Follows the dataviz method: single-hue series,
// thin marks with rounded data-ends, hairline grid, muted axis ink, tooltips on
// every mark. Colors from the validated reference palette (light surface).

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const VIZ = {
  blue: "#2a78d6",
  aqua: "#1baf7a",
  grid: "#e1e0d9",
  muted: "#898781",
  ink: "#0b0b0b",
  // Ordinal blue ramp (light mode floor = step 250) for pipeline stages.
  ordinal: ["#86b6ef", "#6da7ec", "#5598e7", "#2a78d6", "#256abf", "#1c5cab", "#0d366b"],
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(11,11,11,0.10)",
  background: "#ffffff",
  fontSize: 12,
  padding: "6px 10px",
};

const fmtMoney = (v: number) => "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });

export type NameValue = { name: string; value: number };

/** Horizontal bars — categorical identity on the axis, one measure, one hue. */
export function HBarChart({
  data,
  color = VIZ.blue,
  money = false,
  height,
}: {
  data: NameValue[];
  color?: string;
  money?: boolean;
  height?: number;
}) {
  const h = height ?? Math.max(120, data.length * 34 + 24);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={VIZ.grid} strokeWidth={1} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: VIZ.muted }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (money ? fmtMoney(v) : String(v))}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11, fill: VIZ.ink }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          contentStyle={tooltipStyle}
          formatter={(v) => [money ? fmtMoney(Number(v)) : v, money ? "Value" : "Items"]}
        />
        <Bar dataKey="value" fill={color} barSize={16} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Vertical bars over time (monthly sales). Single series, one hue. */
export function MonthlyBarChart({ data, money = true }: { data: NameValue[]; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={VIZ.grid} strokeWidth={1} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: VIZ.muted }} tickLine={false} axisLine={{ stroke: VIZ.grid }} />
        <YAxis
          tick={{ fontSize: 11, fill: VIZ.muted }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v: number) => (money ? fmtMoney(v) : String(v))}
        />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          contentStyle={tooltipStyle}
          formatter={(v) => [money ? fmtMoney(Number(v)) : v, money ? "Sales" : "Count"]}
        />
        <Bar dataKey="value" fill={VIZ.blue} barSize={18} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Selling pipeline: one segmented bar (ordinal ramp) + a swatch list that names
 *  every stage with its count, so identity never rides on color alone. */
export function PipelineBar({ stages }: { stages: Array<{ label: string; count: number }> }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-gray-400">No items in the selling pipeline yet.</p>;
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
        {stages.map((s, i) =>
          s.count > 0 ? (
            <div
              key={s.label}
              title={`${s.label}: ${s.count}`}
              style={{
                width: `${(s.count / total) * 100}%`,
                background: VIZ.ordinal[i % VIZ.ordinal.length],
                marginLeft: i > 0 ? 2 : 0,
              }}
            />
          ) : null
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {stages.map((s, i) => (
          <li key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: VIZ.ordinal[i % VIZ.ordinal.length] }} />
            {s.label}
            <span className="ml-auto font-semibold text-gray-900">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Value-distribution histogram. */
export function HistogramChart({ data }: { data: NameValue[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={VIZ.grid} strokeWidth={1} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: VIZ.muted }} tickLine={false} axisLine={{ stroke: VIZ.grid }} />
        <YAxis tick={{ fontSize: 11, fill: VIZ.muted }} tickLine={false} axisLine={false} width={32} />
        <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} contentStyle={tooltipStyle} formatter={(v) => [v, "Items"]} />
        <Bar dataKey="value" fill={VIZ.aqua} barSize={22} radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={VIZ.aqua} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
