"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ScheduleRow {
  month: number;
  date: string;
  totalPayment: number;
  principalPayment: number;
  interestPayment: number;
  remainingPrincipal: number;
}

interface SchemeDetail {
  id: string;
  name: string;
  customer_name: string;
  product_name: string;
  product_type: string;
  product_price: string;
  payment_plan_name: string;
  interest_rate: string;
  down_payment_pct: string;
  loan_tenor_years: string;
  booking_date: string;
  schedule: { rows: ScheduleRow[]; monthlyPayment: number; downPayment: number; loanAmount: number; totalInterest: number };
}

export default function SchemeDetailPage() {
  const { id } = useParams();
  const [scheme, setScheme] = useState<SchemeDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/schemes/${id}`)
      .then((r) => r.json())
      .then((data) => setScheme(data))
      .catch(console.error);
  }, [id]);

  if (!scheme) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const s = scheme;
  const sched = s.schedule;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/schemes" className="text-slate-400 hover:text-slate-600">← Skema</a>
        <h2 className="text-xl font-bold text-slate-900">{s.name}</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Pelanggan" value={s.customer_name} />
        <SummaryCard label="Produk" value={s.product_name} />
        <SummaryCard label="Harga" value={Number(s.product_price).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })} />
        <SummaryCard label="DP" value={`${s.down_payment_pct}%`} />
        <SummaryCard label="Tenor" value={`${s.loan_tenor_years} tahun`} />
        <SummaryCard label="Bunga" value={`${s.interest_rate}%`} />
        <SummaryCard label="Cicilan/Bulan" value={Number(sched.monthlyPayment).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })} />
        <SummaryCard label="Total Bunga" value={Number(sched.totalInterest).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })} />
      </div>

      {/* Amortization Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Jadwal Pembayaran</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-right px-3 py-2 font-medium text-slate-600">#</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Tanggal</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Cicilan</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Pokok</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Bunga</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Sisa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sched.rows.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50">
                  <td className="text-right px-3 py-2 text-slate-500">{row.month}</td>
                  <td className="text-left px-3 py-2 text-slate-700">{new Date(row.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="text-right px-3 py-2 text-slate-700">{row.totalPayment.toLocaleString("id-ID")}</td>
                  <td className="text-right px-3 py-2 text-slate-600">{row.principalPayment.toLocaleString("id-ID")}</td>
                  <td className="text-right px-3 py-2 text-slate-600">{row.interestPayment.toLocaleString("id-ID")}</td>
                  <td className="text-right px-3 py-2 text-slate-600">{row.remainingPrincipal.toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="font-semibold text-slate-900 text-sm">{value}</div>
    </div>
  );
}
