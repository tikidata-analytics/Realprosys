"use client";

import { useEffect, useState } from "react";
import { parseSort, toggleSort } from "@/lib/formatters";

interface Plan {
  id: string;
  name: string;
  down_payment_pct: string;
  loan_tenor_years: string;
  interest_rate: string;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function PaymentPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", down_payment_pct: "20", loan_tenor_years: "20", interest_rate: "8.5" });
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("created_at:desc");
  const [page, setPage] = useState(1);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    const r = await fetch("/api/payment-plans");
    const data = await r.json();
    setPlans(data);
  };

  const sorted = [...plans].sort((a, b) => {
    const { orderBy, orderDir } = parseSort(sort);
    const va = (a as any)[orderBy] ?? "";
    const vb = (b as any)[orderBy] ?? "";
    const cmp = String(va).localeCompare(String(vb), "id");
    return orderDir === "asc" ? cmp : -cmp;
  });
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/payment-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, down_payment_pct: Number(form.down_payment_pct), loan_tenor_years: Number(form.loan_tenor_years), interest_rate: Number(form.interest_rate) }),
    });
    setForm({ name: "", down_payment_pct: "20", loan_tenor_years: "20", interest_rate: "8.5" });
    setShowForm(false);
    fetchPlans();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus rencana ini?")) return;
    await fetch(`/api/payment-plans/${id}`, { method: "DELETE" });
    fetchPlans();
  };

  const sortIcon = (field: string) => {
    const { orderBy, orderDir } = parseSort(sort);
    if (orderBy !== field) return <span className="text-xs text-slate-300">↕</span>;
    return <span className="text-xs text-indigo-600">{orderDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Rencana Pembayaran</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
          {showForm ? "Batal" : "+ Tambah"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input type="text" placeholder="Nama rencana (misal KPR 20th)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">DP %</label>
              <input type="number" value={form.down_payment_pct} onChange={(e) => setForm({ ...form, down_payment_pct: e.target.value })} required
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tenor (tahun)</label>
              <input type="number" value={form.loan_tenor_years} onChange={(e) => setForm({ ...form, loan_tenor_years: e.target.value })} required
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Bunga (%/tahun)</label>
              <input type="number" step="0.1" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} required
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {plans.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Belum ada rencana pembayaran</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "name")); setPage(1); }}>
                    <span className="flex items-center gap-1">Nama {sortIcon("name")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "down_payment_pct")); setPage(1); }}>
                    <span className="flex items-center justify-end gap-1">DP {sortIcon("down_payment_pct")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "loan_tenor_years")); setPage(1); }}>
                    <span className="flex items-center justify-end gap-1">Tenor {sortIcon("loan_tenor_years")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "interest_rate")); setPage(1); }}>
                    <span className="flex items-center justify-end gap-1">Bunga {sortIcon("interest_rate")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{p.down_payment_pct}%</td>
                    <td className="px-4 py-3 text-right text-slate-600">{p.loan_tenor_years} th</td>
                    <td className="px-4 py-3 text-right text-slate-600">{p.interest_rate}%</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(p.id)} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-500">
              <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, plans.length)} dari {plans.length}</span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(1)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">«</button>
                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">‹</button>
                <span className="px-3 py-1">{page}/{totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">›</button>
                <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
