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

interface UserResult {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  tier: string;
  created_at: string;
}

// ─── Limits section ───────────────────────────────────────────

function LimitsSection() {
  const [rows, setRows] = useState<LimitRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config/limits")
      .then((r) => r.json())
      .then((d) => setRows(d))
      .catch(() => setError("Gagal memuat."));
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
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setRows(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
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
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Tersimpan</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

// ─── User Management section ──────────────────────────────────

function UserManagementSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [newTier, setNewTier] = useState("");
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (q: string) => {
    setQuery(q);
    setSelectedUser(null);
    setSaved(false);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/config/users?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data);
    } catch {
      setError("Pencarian gagal.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (user: UserResult) => {
    setSelectedUser(user);
    setNewTier(user.tier);
    setNewRole(user.role);
    setSaved(false);
    setError("");
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setError("");
    try {
      const body: { tier?: string; role?: string } = {};
      if (newTier !== selectedUser.tier) body.tier = newTier;
      if (newRole !== selectedUser.role) body.role = newRole;
      if (!body.tier && !body.role) return;

      const res = await fetch(`/api/config/users/${selectedUser.id}/tier`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSelectedUser((u) => u ? { ...u, tier: updated.tier, role: updated.role } : u);
      // Update in results list too
      setResults((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, tier: updated.tier, role: updated.role } : u));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm text-slate-500">
          Ubah tier atau role user. Setiap perubahan dicatat dalam audit log.
        </p>
      </div>

      {/* Search */}
      <div className="px-4 py-4 border-b border-slate-100">
        <input
          type="text"
          placeholder="Cari email atau username..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
        />
        {searching && <p className="text-xs text-slate-400 mt-1">Mencari...</p>}
      </div>

      {/* Results */}
      {results.length > 0 && !selectedUser && (
        <div className="divide-y divide-slate-100">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => selectUser(user)}
              className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium text-slate-800">{user.name || user.username}</div>
                <div className="text-xs text-slate-400">{user.email} · @{user.username}</div>
              </div>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${user.tier === "premium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {user.tier}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {user.role}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && !searching && (
        <div className="px-4 py-6 text-center text-sm text-slate-400">Tidak ditemukan.</div>
      )}

      {/* Selected user panel */}
      {selectedUser && (
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-slate-800">{selectedUser.name || selectedUser.username}</div>
              <div className="text-xs text-slate-400">{selectedUser.email} · @{selectedUser.username}</div>
            </div>
            <button
              onClick={() => { setSelectedUser(null); setQuery(""); setResults([]); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              ✕ Batal
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tier</label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="user">User</option>
                <option value="webmaster">Webmaster</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || (newTier === selectedUser.tier && newRole === selectedUser.role)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            {saved && <span className="text-sm text-green-600">✓ Tersimpan</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tier History section ─────────────────────────────────────

interface HistoryRow {
  id: string;
  user_id: string;
  user_email: string;
  user_username: string;
  from_tier: string | null;
  to_tier: string | null;
  from_role: string | null;
  to_role: string | null;
  changed_by: string;
  changed_by_email: string;
  changed_at: string;
}

function TierHistorySection() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userQ, setUserQ] = useState("");
  const [action, setAction] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(userQ), 350);
    return () => clearTimeout(t);
  }, [userQ]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("user_q", debouncedQ);
    if (action) params.set("action", action);
    fetch(`/api/config/tier-history?${params}`)
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debouncedQ, action]);

  const changeLabel = (row: HistoryRow) => {
    const parts: string[] = [];
    if (row.from_tier && row.to_tier && row.from_tier !== row.to_tier) {
      parts.push(`${row.from_tier} → ${row.to_tier}`);
    }
    if (row.from_role && row.to_role && row.from_role !== row.to_role) {
      parts.push(`role: ${row.from_role} → ${row.to_role}`);
    }
    return parts.join(", ") || "—";
  };

  const isUpgrade = (row: HistoryRow) =>
    row.from_tier === "free" && row.to_tier === "premium";
  const isDowngrade = (row: HistoryRow) =>
    row.from_tier === "premium" && row.to_tier === "free";

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm text-slate-500">
          Riwayat perubahan tier dan role setiap user. Hanya webmaster yang bisa melihat.
        </p>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by user email..."
          value={userQ}
          onChange={(e) => setUserQ(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">Semua</option>
          <option value="upgrade">Upgrade</option>
          <option value="downgrade">Downgrade</option>
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Memuat...</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">Belum ada riwayat perubahan.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Perubahan</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Oleh</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-800">{row.user_email}</div>
                  <div className="text-xs text-slate-400">@{row.user_username}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isUpgrade(row) ? "bg-green-100 text-green-700"
                    : isDowngrade(row) ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
                  }`}>
                    {changeLabel(row)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{row.changed_by_email}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{fmt(row.changed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<"limits" | "users" | "history">("limits");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config/limits")
      .then((r) => {
        if (r.status === 403) {
          window.location.href = "/dashboard";
          return null;
        }
        return r.json();
      })
      .then(() => setLoading(false))
      .catch(() => {
        window.location.href = "/dashboard";
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard" className="text-slate-400 hover:text-slate-600">← Dashboard</a>
        <h2 className="text-xl font-bold text-slate-900">Konfigurasi</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("limits")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "limits"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Tier Limits
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Manajemen User
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "history"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Riwayat Tier
        </button>
      </div>

      {activeTab === "limits" ? <LimitsSection /> : activeTab === "users" ? <UserManagementSection /> : <TierHistorySection />}
    </div>
  );
}
