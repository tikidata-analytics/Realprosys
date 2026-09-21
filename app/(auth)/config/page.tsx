"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RESOURCES = ["customers", "payment_plans", "schemes", "products", "projects"] as const;
const TIERS = ["free", "premium"] as const;

type Resource = typeof RESOURCES[number];
type Tier = typeof TIERS[number];

interface LimitRow {
  tier: Tier;
  resource: string;
  limit_val: number;
}

export default function ConfigPage() {
  const [rows, setRows] = useState<LimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config/limits")
      .then((r) => {
        if (r.status === 403) {
          window.location.href = "/dashboard";
          return;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setRows(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat konfigurasi.");
        setLoading(false);
      });
  }, []);

  const getLimit = (tier: Tier, resource: Resource) => {
    const row = rows.find((r) => r.tier === tier && r.resource === resource);
    return row?.limit_val ?? 0;
  };

  const setLimit = (tier: Tier, resource: Resource, val: number) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.tier === tier && r.resource === resource);
      if (existing) {
        return prev.map((r) =>
          r.tier === tier && r.resource === resource ? { ...r, limit_val: val } : r
        );
      }
      return [...prev, { tier, resource, limit_val: val }];
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = TIERS.flatMap((tier) =>
        RESOURCES.map((resource) => ({
          tier,
          resource,
          limit: getLimit(tier, resource),
        }))
      );
      const res = await fetch("/api/config/limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setRows(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h1>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard" className="text-slate-400 hover:text-slate-600">← Dashboard</a>
        <h2 className="text-xl font-bold text-slate-900">Konfigurasi Tier Limits</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="text-sm text-slate-500">
            Atur batas maksimal untuk setiap resource per tier. Webmaster tidak terpengaruh limit.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Resource</th>
                {TIERS.map((tier) => (
                  <th key={tier} className="text-center px-4 py-3 font-medium text-slate-600 capitalize">
                    {tier === "free" ? "Free" : "Premium"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RESOURCES.map((resource) => (
                <tr key={resource} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700 capitalize">
                    {resource.replace("_", " ")}
                  </td>
                  {TIERS.map((tier) => (
                    <td key={tier} className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={getLimit(tier, resource)}
                        onChange={(e) =>
                          setLimit(tier, resource, Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-20 text-center border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-4 border-t border-slate-200 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              ✓ Tersimpan
            </span>
          )}
          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
