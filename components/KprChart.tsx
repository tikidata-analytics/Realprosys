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

function fmtIdr(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
  return val.toFixed(0);
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

  // ---- Chart: Pokok vs Bunga ----
  const maxComponent = Math.max(
    Math.max(...sampled.map(r => r.principal)),
    Math.max(...sampled.map(r => r.interest))
  );
  const scaleY = (v: number) => PT + chartH - (v / maxComponent) * chartH;

  const pathPrincipal = sampled.map((r, i) => {
    const x = scaleX(i);
    const y = scaleY(r.principal);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const pathInterest = sampled.map((r, i) => {
    const x = scaleX(i);
    const y = scaleY(r.interest);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
    y: PT + chartH - frac * chartH,
    val: frac * maxComponent,
  }));

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden mb-3">
      <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
        <span className="text-xs font-medium text-blue-700">Grafik KPR</span>
      </div>
      <div className="bg-slate-50 p-2" style={{ overflowX: "auto" }}>
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
          <path d={pathPrincipal} fill="none" stroke="#22c55e" strokeWidth="2" />
          <path d={pathInterest} fill="none" stroke="#f97316" strokeWidth="2" />

          {/* Legend inside SVG */}
          <g transform={`translate(${PL}, ${PT})`}>
            {[
              { color: "#22c55e", label: "Pokok" },
              { color: "#f97316", label: "Bunga" },
            ].map(({ color, label }, i) => (
              <g key={label} transform={`translate(${i * 100}, 0)`}>
                <line x1="0" y1="0" x2="14" y2="0" stroke={color} strokeWidth="2" />
                <text x="18" y="3" fontSize="9" fill="#475569">{label}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
