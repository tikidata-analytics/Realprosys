"use client";

import { useEffect, useState } from "react";

interface Plan {
  id: string;
  name: string;
  down_payment_pct: string;
  loan_tenor_years: string;
  interest_rate: string;
}

export default function PaymentPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", down_payment_pct: "20", loan_tenor_years: "20", interest_rate: "8.5" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    const r = await fetch("/api/payment-plans");
    const data = await r.json();
    setPlans(data);
  };

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
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nama</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">DP</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Tenor</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Bunga</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{p.down_payment_pct}%</td>
                  <td className="px-4 py-3 text-right text-slate-600">{p.loan_tenor_years} th</td>
                  <td className="px-4 py-3 text-right text-slate-600">{p.interest_rate}%</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(p.id)}
                      className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
