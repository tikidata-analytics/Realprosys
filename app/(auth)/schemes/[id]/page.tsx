"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import KprChart from "@/components/KprChart";

export default function SchemeDetailPage() {
  const { id } = useParams();
  const [scheme, setScheme] = useState<any>(null);

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
  const sched = s.schedule || {};
  const stages = sched.stages || [];

  const nonKprStages = stages.filter((r: any) => !r.is_kpr);
  const kprStages = stages.filter((r: any) => r.is_kpr);

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
        <SummaryCard label="Harga" value={Number(sched.housePrice || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })} />
        {sched.kprAmount > 0 && (
          <>
            <SummaryCard label="Pinjaman KPR" value={Number(sched.kprAmount).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })} />
            <SummaryCard label="Cicilan/Bulan" value={Number(sched.kprMonthlyPayment || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })} />
          </>
        )}
      </div>

      {/* Non-KPR Table */}
      {nonKprStages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Jadwal Pembayaran Non-KPR</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Tahap</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Tanggal</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pembayaran</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sebelum</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sesudah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nonKprStages.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        row.stage_type === "BOOKING_FEE" ? "bg-amber-100 text-amber-700" :
                        row.stage_type === "DOWN_PAYMENT" ? "bg-green-100 text-green-700" :
                        row.stage_type === "SETTLEMENT" ? "bg-purple-100 text-purple-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {row.stage_type === "BOOKING_FEE" ? "Booking Fee" :
                         row.stage_type === "DOWN_PAYMENT" ? "Uang Muka" :
                         row.stage_type === "SETTLEMENT" ? "Pelunasan" :
                         row.stage_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {new Date(row.due_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row.amount || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.sebelum_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.setelah_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPR Table */}
      {kprStages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Jadwal Pembayaran KPR</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Angsuran</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Tanggal</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pembayaran</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pokok</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Bunga</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sebelum</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sesudah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kprStages.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        KPR #{idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {new Date(row.due_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row.amount || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {Number(row.principal || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {Number(row.interest || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.sebelum_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.setelah_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPR Chart */}
      {sched.kprAmount > 0 && sched.kprSchedule && (
        <KprChart schedule={sched.kprSchedule.map((r: any) => ({ ...r, remaining_balance: r.setelah_pengurangan }))} />
      )}
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
