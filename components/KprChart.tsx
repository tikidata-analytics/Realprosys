"use client";

interface KprChartProps {
  schedule: {
    amount: number;
    principal: number;
    interest: number;
    remaining_balance: number;
    due_date: string;
  }[];
}

const W = 640;
const H = 220;
const PL = 55;
const PR = 20;
const PT = 10;
const PB = 35;

function chartHeader(title: string) {
  return (
    <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
      <span className="text-xs font-medium text-blue-700">{title}</span>
    </div>
  );
}

function fmtIdr(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
  return val.toFixed(0);
}

function SvgChart({
  sampled,
  scaleY,
  scaleX,
  chartW,
  chartH,
  yLabels,
  xLabels,
  lines,
}: {
  sampled: KprChartProps["schedule"];
  scaleY: (v: number) => number;
  scaleX: (i: number) => number;
  chartW: number;
  chartH: number;
  yLabels: { y: number; val: number }[];
  xLabels: { x: number; label: string }[];
  lines: { d: string; stroke: string; strokeWidth?: number; strokeDasharray?: string }[];
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: `${W}px` }}>
      {/* Grid */}
      {yLabels.map(({ y, val }) => (
        <g key={val}>
          <line x1={PL} y1={y} x2={PL + chartW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
          <text x={PL - 5} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
            {fmtIdr(val)}
          </text>
        </g>
      ))}

      {/* X axis */}
      {xLabels.map(({ x, label }) => (
        <text key={x} x={x} y={PT + chartH + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">
          {label}
        </text>
      ))}

      {/* Lines */}
      {lines.map((line, i) => (
        <path key={i} d={line.d} fill="none" stroke={line.stroke} strokeWidth={line.strokeWidth ?? 2} strokeDasharray={line.strokeDasharray} />
      ))}
    </svg>
  );
}

export default function KprChart({ schedule }: KprChartProps) {
  if (!schedule || schedule.length === 0) return null;

  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  // Sample to max 60 points
  const total = schedule.length;
  const step = Math.max(1, Math.floor(total / 60));
  const sampled = schedule.filter((_, i) => i % step === 0 || i === total - 1);

  const scaleX = (i: number) => PL + (i / (sampled.length - 1)) * chartW;

  // X axis labels
  const xLabels: { x: number; label: string }[] = [];
  const xStep = Math.max(1, Math.floor(sampled.length / 6));
  for (let i = 0; i < sampled.length; i += xStep) {
    const d = new Date(sampled[i].due_date);
    xLabels.push({ x: scaleX(i), label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) });
  }
  const lastIdx = sampled.length - 1;
  if (!xLabels.find(l => l.x === scaleX(lastIdx))) {
    const d = new Date(sampled[lastIdx].due_date);
    xLabels.push({ x: scaleX(lastIdx), label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) });
  }

  // ---- Chart 1: Cicilan vs Outstanding Balance ----
  const maxBalance = Math.max(...sampled.map(r => r.remaining_balance));
  const scaleY1 = (v: number) => PT + chartH - (v / maxBalance) * chartH;
  const pathBalance = sampled.map((r, i) => {
    const x = scaleX(i);
    const y = scaleY1(r.remaining_balance);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const pathAmount = sampled.map((r, i) => {
    const x = scaleX(i);
    const y = scaleY1(r.amount);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const yLabels1 = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
    y: PT + chartH - frac * chartH,
    val: frac * maxBalance,
  }));

  const legend1 = [
    { color: "#3b82f6", label: "Cicilan" },
    { color: "#ef4444", label: "Outstanding", dashed: true },
  ];

  // ---- Chart 2: Pokok vs Bunga ----
  const maxComponent = Math.max(
    Math.max(...sampled.map(r => r.principal)),
    Math.max(...sampled.map(r => r.interest))
  );
  const scaleY2 = (v: number) => PT + chartH - (v / maxComponent) * chartH;

  const pathPrincipal = sampled.map((r, i) => {
    const x = scaleX(i);
    const y = scaleY2(r.principal);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const pathInterest = sampled.map((r, i) => {
    const x = scaleX(i);
    const y = scaleY2(r.interest);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const yLabels2 = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
    y: PT + chartH - frac * chartH,
    val: frac * maxComponent,
  }));

  const legend2 = [
    { color: "#22c55e", label: "Pokok" },
    { color: "#f97316", label: "Bunga" },
  ];

  const Legend = ({ items }: { items: typeof legend1 }) => (
    <g transform={`translate(${PL}, ${PT})`}>
      {items.map(({ color, label, dashed }, i) => (
        <g key={label} transform={`translate(${i * 100}, 0)`}>
          <line x1="0" y1="0" x2="14" y2="0" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4,2" : "none"} />
          <text x="18" y="3" fontSize="9" fill="#475569">{label}</text>
        </g>
      ))}
    </g>
  );

  return (
    <div className="space-y-3 mb-3">
      {/* Chart 1: Cicilan vs Outstanding */}
      <div className="border border-blue-200 rounded-lg overflow-hidden">
        {chartHeader("Grafik KPR — Cicilan & Outstanding")}
        <div className="bg-slate-50 p-2" style={{ overflowX: "auto" }}>
          <SvgChart
            sampled={sampled}
            scaleY={scaleY1}
            scaleX={scaleX}
            chartW={chartW}
            chartH={chartH}
            yLabels={yLabels1}
            xLabels={xLabels}
            lines={[
              { d: pathAmount, stroke: "#3b82f6" },
              { d: pathBalance, stroke: "#ef4444", strokeDasharray: "4,2" },
            ]}
          />
          <div className="px-3 pb-1">
            <Legend items={legend1} />
          </div>
        </div>
      </div>

      {/* Chart 2: Pokok vs Bunga */}
      <div className="border border-blue-200 rounded-lg overflow-hidden">
        {chartHeader("Grafik KPR — Pokok & Bunga")}
        <div className="bg-slate-50 p-2" style={{ overflowX: "auto" }}>
          <SvgChart
            sampled={sampled}
            scaleY={scaleY2}
            scaleX={scaleX}
            chartW={chartW}
            chartH={chartH}
            yLabels={yLabels2}
            xLabels={xLabels}
            lines={[
              { d: pathPrincipal, stroke: "#22c55e" },
              { d: pathInterest, stroke: "#f97316" },
            ]}
          />
          <div className="px-3 pb-1">
            <Legend items={legend2} />
          </div>
        </div>
      </div>
    </div>
  );
}
