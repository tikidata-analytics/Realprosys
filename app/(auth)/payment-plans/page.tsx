"use client";

import { useEffect, useState } from "react";
import { parseSort, toggleSort } from "@/lib/formatters";

const STAGE_TYPES = [
  { value: "BOOKING_FEE", label: "Booking Fee" },
  { value: "DOWN_PAYMENT", label: "Uang Muka (DP)" },
  { value: "KPR", label: "KPR / KPA" },
  { value: "SETTLEMENT", label: "Pelunasan" },
];

const AMOUNT_TYPES = [
  { value: "FIXED", label: "Fixed (Rp)" },
  { value: "PERCENTAGE", label: "Persen (%)" },
];

const PAGE_SIZE = 10;

function emptyStage() {
  return { stage_type: "DOWN_PAYMENT", amount_type: "PERCENTAGE", stage_value: "", interval_months: 0 };
}

export default function PaymentPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [stages, setStages] = useState<any[]>([{ ...emptyStage(), stage_value: "20" }]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("created_at:desc");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const sortIcon = (field: string) => {
    const { orderBy, orderDir } = parseSort(sort);
    if (orderBy !== field) return <span className="text-xs text-slate-300">↕</span>;
    return <span className="text-xs text-indigo-600">{orderDir === "asc" ? "↑" : "↓"}</span>;
  };

  // Stage management
  const addStage = () => {
    setStages([...stages, { ...emptyStage() }]);
  };

  const removeStage = (idx: number) => {
    setStages(stages.filter((_, i) => i !== idx));
  };

  const updateStage = (idx: number, field: string, value: any) => {
    const updated = [...stages];
    updated[idx] = { ...updated[idx], [field]: value };
    // Auto-reset KPR value when type changes
    if (field === "stage_type" && value !== "KPR") {
      updated[idx].stage_value = "";
    }
    if (field === "stage_type" && value === "KPR") {
      updated[idx].amount_type = "PERCENTAGE";
      updated[idx].stage_value = "8.5";
      updated[idx].interval_months = 20;
    }
    setStages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    // Validate: zero-value non-KPR stages
    const zeroStages = stages.filter(s => s.stage_type !== "KPR" && (s.stage_value == null || Number(s.stage_value) <= 0));
    if (zeroStages.length > 0) {
      alert("Tahapan dengan nilai 0 (nol) harus dihapus. Klik ✕ pada baris tersebut untuk menghapusnya.");
      return;
    }

    setLoading(true);

    const payload = {
      name: form.name,
      stages: stages.map((s, i) => ({
        stage_type: s.stage_type,
        stage_order: i,
        amount_type: s.stage_type === "KPR" ? "PERCENTAGE" : s.amount_type,
        stage_value: s.stage_type === "KPR" ? parseFloat(s.stage_value) || 8.5 : (parseFloat(s.stage_value) || 0),
        interval_months: s.stage_type === "KPR" ? parseInt(s.interval_months) || 20 : (parseInt(s.interval_months) || 0),
      })),
    };

    if (editingId) {
      await fetch(`/api/payment-plans/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/payment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setForm({ name: "" });
    setStages([{ ...emptyStage(), stage_value: "20" }]);
    setShowForm(false);
    setEditingId(null);
    fetchPlans();
    setLoading(false);
  };

  const startEdit = (plan: any) => {
    setForm({ name: plan.name });
    setStages(
      (plan.stages || []).map((s: any) => ({
        stage_type: s.stage_type,
        amount_type: s.amount_type,
        stage_value: s.stage_value != null ? String(s.stage_value) : "",
        interval_months: s.interval_months || 0,
      }))
    );
    setShowForm(true);
    setEditingId(plan.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus rencana ini?")) return;
    await fetch(`/api/payment-plans/${id}`, { method: "DELETE" });
    fetchPlans();
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "" });
    setStages([{ ...emptyStage(), stage_value: "20" }]);
  };

  const stageLabel = (type: string) => STAGE_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Rencana Pembayaran</h2>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "" }); setStages([{ ...emptyStage(), stage_value: "20" }]); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
          {showForm ? "Batal" : "+ Tambah"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-5">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Nama rencana (misal: Cash Bertahap 12x)"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>

          {/* Stages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Tahapan Pembayaran</span>
              <button type="button" onClick={addStage}
                className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                + Tambah Stage
              </button>
            </div>

            {stages.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {/* Drag handle */}
                <span className="text-slate-400 cursor-grab text-sm">☰</span>

                {/* Stage type */}
                <select value={stage.stage_type}
                  onChange={(e) => updateStage(idx, "stage_type", e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                  {STAGE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                {/* Amount type */}
                {stage.stage_type !== "KPR" ? (
                  <>
                    <select value={stage.amount_type}
                      onChange={(e) => updateStage(idx, "amount_type", e.target.value)}
                      className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                      {AMOUNT_TYPES.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>

                    {/* Value */}
                    <input type="number" value={stage.stage_value}
                      onChange={(e) => updateStage(idx, "stage_value", e.target.value)}
                      placeholder={stage.amount_type === "PERCENTAGE" ? "%" : "Rp"}
                      className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                  </>
                ) : (
                  <>
                    <span className="text-xs text-slate-500 px-2">Bunga</span>
                    <input type="number" value={stage.stage_value}
                      onChange={(e) => updateStage(idx, "stage_value", e.target.value)}
                      placeholder="%"
                      className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                    <span className="text-xs text-slate-500 px-1">%/thn</span>
                    <span className="text-xs text-slate-500 px-2">Tenor</span>
                    <input type="number" value={stage.interval_months}
                      onChange={(e) => updateStage(idx, "interval_months", e.target.value)}
                      placeholder="thn"
                      className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                    <span className="text-xs text-slate-500">thn</span>
                  </>
                )}

                {/* Interval */}
                {stage.stage_type !== "KPR" && (
                  <>
                    <span className="text-xs text-slate-400 px-1">Interval</span>
                    <input type="number" value={stage.interval_months}
                      onChange={(e) => updateStage(idx, "interval_months", e.target.value)}
                      min="0"
                      className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                    <span className="text-xs text-slate-400">bulan</span>
                  </>
                )}

                <button type="button" onClick={() => removeStage(idx)}
                  className="ml-auto text-red-400 hover:text-red-600 text-sm px-2 py-1">
                  ✕
                </button>
              </div>
            ))}
          </div>

          {stages.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              Minimal harus ada 1 tahap pembayaran
            </p>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={loading || stages.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
              {loading ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">
                Batal
              </button>
            )}
          </div>
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
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100"
                    onClick={() => { setSort(toggleSort(sort, "name")); setPage(1); }}>
                    <span className="flex items-center gap-1">Nama {sortIcon("name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tahapan</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {(p.stages || []).map((s: any, i: number) => (
                          <span key={i} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {stageLabel(s.stage_type)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(p)} className="px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg mr-1">Edit</button>
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
