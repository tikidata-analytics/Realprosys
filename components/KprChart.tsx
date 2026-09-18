"use client";

import { formatCurrency } from "@/lib/formatters";

interface KprChartProps {
  schedule: {
    amount: number;
    principal: number;
    interest: number;
    due_date: string;
  }[];
}

export default function KprChart({ schedule }: KprChartProps) {
  if (!schedule || schedule.length === 0) return null;

  const W = 600;
  const H = 200;
  const PL = 50;
  const PR = 20;
  const PT = 10;
  const PB = 30;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const maxAmt = Math.max(...schedule.map(r => r.amount));

  // Sample every N rows to keep SVG manageable (max 120 points)
  const total = schedule.length;
  const step = Math.max(1, Math.floor(total / 80));
  const sampled = schedule.filter((_, i) => i % step === 0 || i === total - 1);

  const scaleX = (i: number) => PL + (i / (sampled.length - 1)) * chartW;
  const scaleY = (v: number) => PT + chartH - (v / maxAmt) * chartH;

  const path = (key: keyof typeof schedule[0]) => {
    return sampled.map((r, i) => {
      const x = scaleX(i);
      const y = scaleY(r[key] as number);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  };

  const dotPositions = (key: keyof typeof schedule[0]) =>
    sampled.map((r, i) => ({ x: scaleX(i), y: scaleY(r[key] as number) }));

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden mb-3">
      <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
        <span className="text-xs font-medium text-blue-700">Grafik KPR</span>
      </div>
      <div className="bg-slate-50 p-2" style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: `${W}px` }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PT + chartH - frac * chartH;
            const val = frac * maxAmt;
            return (
              <g key={frac}>
                <line x1={PL} y1={y} x2={PL + chartW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={PL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
                  {frac === 0 ? "0" : `${(frac * 100).toFixed(0)}%`}
                </text>
                <text x={PL + chartW + 4} y={y + 3} textAnchor="start" fontSize="8" fill="#64748b">
                  {formatCurrency(val).replace("Rp", "").trim()}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {[0, sampled.length - 1].map((idx) => (
            <text key={idx} x={scaleX(idx)} y={PT + chartH + 12} textAnchor={idx === 0 ? "start" : "end"} fontSize="8" fill="#94a3b8">
              Bln {idx + 1}
            </text>
          ))}

          {/* Lines */}
          <path d={path("amount")} fill="none" stroke="#3b82f6" strokeWidth="2" />
          <path d={path("principal")} fill="none" stroke="#22c55e" strokeWidth="2" />
          <path d={path("interest")} fill="none" stroke="#f97316" strokeWidth="2" />

          {/* Dots on intersections */}
          {(dotPositions("interest")).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#f97316" />
          ))}

          {/* Legend */}
          <g transform={`translate(${PL}, ${PT - 2})`}>
            {[
              { color: "#3b82f6", label: "Cicilan" },
              { color: "#22c55e", label: "Pokok" },
              { color: "#f97316", label: "Bunga" },
            ].map(({ color, label }, i) => (
              <g key={label} transform={`translate(${i * 90}, 0)`}>
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
