"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RESOURCES = ["customers", "payment_plans", "schemes", "products", "projects"] as const;
type Resource = typeof RESOURCES[number];

// ─── Shared types ────────────────────────────────────────────────

interface TierDef {
  name: string;
  monthly_price: string | number;
  yearly_price: string | number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  permanent: boolean;
  featured: boolean;
  limits: Record<string, number>;
  created_at?: string;
}

interface LimitRow {
  tier: string;
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

// ─── Tier CRUD section ───────────────────────────────────────────

function TierSection() {
  const [tiers, setTiers] = useState<TierDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TierDef>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", monthly_price: "", yearly_price: "", permanent: true, start_date: "", end_date: "", is_active: true, featured: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  const fetchTiers = () => {
    setLoading(true);
    fetch("/api/config/tiers")
      .then((r) => r.json())
      .then((data) => { setTiers(data); setLoading(false); })
      .catch(() => { setError("Gagal memuat tier."); setLoading(false); });
  };

  useEffect(() => { fetchTiers(); }, []);

  const startEdit = (t: TierDef) => {
    setEditing(t.name);
    setEditForm({ ...t });
    setSaved("");
  };

  const cancelEdit = () => { setEditing(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    const originalTier = tiers.find((t) => t.name === editing);
    try {
      const res = await fetch(`/api/config/tiers/${editing}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permanent: editForm.permanent ?? originalTier?.permanent ?? true,
          monthly_price: Number(editForm.monthly_price) || 0,
          yearly_price: Number(editForm.yearly_price) || 0,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          is_active: editForm.is_active,
          featured: editForm.featured,
          limits: editForm.limits,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan.");
      }
      const updated = await res.json();
      setTiers((prev) => prev.map((t) => (t.name === editing ? updated : t)));
      setEditing(null);
      setSaved("✓ Tersimpan");
      setTimeout(() => setSaved(""), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (name: string) => {
    if (!confirm(`Hapus tier "${name}"?`)) return;
    try {
      const res = await fetch(`/api/config/tiers/${name}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus.");
      }
      setTiers((prev) => prev.filter((t) => t.name !== name));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) { alert("Nama tier wajib diisi."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/config/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim().toLowerCase().replace(/\s+/g, "_"),
          monthly_price: Number(createForm.monthly_price) || 0,
          yearly_price: Number(createForm.yearly_price) || 0,
          permanent: createForm.permanent,
          start_date: createForm.permanent ? null : (createForm.start_date || null),
          end_date: createForm.permanent ? null : (createForm.end_date || null),
          is_active: createForm.is_active,
          featured: createForm.featured,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat tier.");
      }
      await fetchTiers();
      setShowCreate(false);
      setCreateForm({ name: "", monthly_price: "", yearly_price: "", permanent: true, start_date: "", end_date: "", is_active: true, featured: false });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: string | number | null | undefined) =>
    v == null ? "—" : typeof v === "number" ? v.toLocaleString("id-ID") : v;

  const fmtDate = (v: string | null) => v || "—";

  const fmtPrice = (v: string | number) =>
    Number(v) === 0 ? "Gratis" : `Rp ${Number(v).toLocaleString("id-ID")}`;

  if (loading) return <div className="p-8 text-center text-slate-400">Memuat...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Kelola nama, harga, dan periode berlaku setiap tier.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Tier Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tier</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Harga Bulanan</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Harga Tahunan</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Berlaku</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Featured</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tiers.map((t) => (
                <tr key={t.name} className="hover:bg-slate-50">
                  {editing === t.name ? (
                    <>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-indigo-700">{t.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min="0" value={editForm.monthly_price ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, monthly_price: Number(e.target.value) })}
                          className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min="0" value={editForm.yearly_price ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, yearly_price: Number(e.target.value) })}
                          className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm" />
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        <label className="flex items-center gap-1.5 cursor-pointer mb-1">
                          <input type="checkbox"
                            checked={editForm.permanent ?? true}
                            onChange={(e) => setEditForm({ ...editForm, permanent: e.target.checked })}
                            className="rounded border-slate-300 text-indigo-600" />
                          <span className="text-xs text-slate-600">Permanen</span>
                        </label>
                        {(editForm.permanent !== false) && (
                          <div className="text-xs text-slate-400 italic pt-0.5">Tanggal tidak diperlukan</div>
                        )}
                        {editForm.permanent === false && (
                          <>
                            <input type="date" value={editForm.start_date ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value || null })}
                              className="w-32 border border-slate-300 rounded-lg px-2 py-1 text-xs" />
                            <input type="date" value={editForm.end_date ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value || null })}
                              className="w-32 border border-slate-300 rounded-lg px-2 py-1 text-xs" />
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox"
                            checked={editForm.featured ?? false}
                            onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                            className="rounded border-slate-300 text-indigo-600" />
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox"
                            checked={editForm.is_active ?? false}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                            className="rounded border-slate-300 text-indigo-600" />
                          <span className="text-xs text-slate-600">Aktif</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={saveEdit} disabled={saving}
                            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? "..." : "Simpan"}
                          </button>
                          <button onClick={cancelEdit}
                            className="px-3 py-1 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">
                            Batal
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-slate-800">{t.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{fmtPrice(t.monthly_price)}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{fmtPrice(t.yearly_price)}</td>
                      <td className="px-4 py-3 text-center">
                        {t.permanent ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Permanen</span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {fmtDate(t.start_date as string)} — {fmtDate(t.end_date as string)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.featured && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">Featured</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {t.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(t)}
                            className="px-3 py-1 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">
                            Edit
                          </button>
                          {t.name !== "free" && t.name !== "premium" && (
                            <button onClick={() => deleteTier(t.name)}
                              className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50">
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="px-4 py-3 border-t border-slate-200 text-sm text-red-600">{error} {saved}</div>}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Tier Baru</h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nama Tier</label>
              <input type="text" value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="misal: starter, promo_mingguan"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Harga Bulanan (Rp)</label>
                <input type="number" min="0" value={createForm.monthly_price}
                  onChange={(e) => setCreateForm({ ...createForm, monthly_price: e.target.value })}
                  placeholder="0 = gratis"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Harga Tahunan (Rp)</label>
                <input type="number" min="0" value={createForm.yearly_price}
                  onChange={(e) => setCreateForm({ ...createForm, yearly_price: e.target.value })}
                  placeholder="0 = gratis"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={createForm.permanent}
                onChange={(e) => setCreateForm({ ...createForm, permanent: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600" />
              <span className="text-sm text-slate-700">Permanen — berlaku selamanya tanpa batasan tanggal</span>
            </label>
            {!createForm.permanent && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Mulai</label>
                  <input type="date" value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Berakhir</label>
                  <input type="date" value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={createForm.featured}
                onChange={(e) => setCreateForm({ ...createForm, featured: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600" />
              <span className="text-sm text-slate-700">Featured — tampilkan badge FEATURED di pricing table</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={createForm.is_active}
                onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600" />
              <span className="text-sm text-slate-700">Aktif segera setelah dibuat</span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowCreate(false); setError(""); }}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Menyimpan..." : "Buat Tier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Limits section (dynamic) ────────────────────────────────────

function LimitsSection() {
  const [tiers, setTiers] = useState<string[]>([]);
  const [rows, setRows] = useState<LimitRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config/tiers")
      .then((r) => r.json())
      .then((data: TierDef[]) => {
        setTiers(data.map((t) => t.name));
        // Also load limits
        return fetch("/api/config/limits").then((r) => r.json());
      })
      .then((d) => setRows(d))
      .catch(() => setError("Gagal memuat."));
  }, []);

  const getLimit = (tier: string, resource: string) => {
    const row = rows.find((r) => r.tier === tier && r.resource === resource);
    return row?.limit_val ?? 0;
  };

  const setLimit = (tier: string, resource: string, val: number) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.tier === tier && r.resource === resource);
      if (existing) return prev.map((r) => r.tier === tier && r.resource === resource ? { ...r, limit_val: val } : r);
      return [...prev, { tier, resource, limit_val: val }];
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = tiers.flatMap((tier) =>
        RESOURCES.map((resource) => ({ tier, resource, limit: getLimit(tier, resource) }))
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
        <p className="text-sm text-slate-500">Atur batas maksimal untuk setiap resource per tier. Webmaster tidak terpengaruh limit.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Resource</th>
              {tiers.map((tier) => (
                <th key={tier} className="text-center px-4 py-3 font-medium text-slate-600 capitalize">
                  {tier}
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
                {tiers.map((tier) => (
                  <td key={tier} className="px-4 py-3 text-center">
                    <input
                      type="number" min="0"
                      value={getLimit(tier, resource)}
                      onChange={(e) => setLimit(tier, resource, Math.max(0, parseInt(e.target.value) || 0))}
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
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Tersimpan</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

// ─── User Management section (dynamic tier list) ─────────────────

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
  const [availableTiers, setAvailableTiers] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/config/tiers")
      .then((r) => r.json())
      .then((data: TierDef[]) => setAvailableTiers(data.map((t) => t.name)));
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setSelectedUser(null);
    setSaved(false);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/config/users?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      setResults(await res.json());
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
        <p className="text-sm text-slate-500">Ubah tier atau role user. Setiap perubahan dicatat dalam audit log.</p>
      </div>
      <div className="px-4 py-4 border-b border-slate-100">
        <input type="text" placeholder="Cari email atau username..." value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
        {searching && <p className="text-xs text-slate-400 mt-1">Mencari...</p>}
      </div>

      {results.length > 0 && !selectedUser && (
        <div className="divide-y divide-slate-100">
          {results.map((user) => (
            <button key={user.id} onClick={() => selectUser(user)}
              className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-800">{user.name || user.username}</div>
                <div className="text-xs text-slate-400">{user.email} · @{user.username}</div>
              </div>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${user.tier === "premium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {user.tier}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{user.role}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && !searching && (
        <div className="px-4 py-6 text-center text-sm text-slate-400">Tidak ditemukan.</div>
      )}

      {selectedUser && (
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-slate-800">{selectedUser.name || selectedUser.username}</div>
              <div className="text-xs text-slate-400">{selectedUser.email} · @{selectedUser.username}</div>
            </div>
            <button onClick={() => { setSelectedUser(null); setQuery(""); setResults([]); }}
              className="text-xs text-slate-400 hover:text-slate-600">✕ Batal</button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tier</label>
              <select value={newTier} onChange={(e) => setNewTier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                {availableTiers.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="user">User</option>
                <option value="webmaster">Webmaster</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving || (newTier === selectedUser.tier && newRole === selectedUser.role)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
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

// ─── Tier History section ────────────────────────────────────────

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

// ─── Membership section ─────────────────────────────────────────

interface MembershipRow {
  id: string;
  user_id: string;
  tier: string;
  start_date: string;
  end_date: string;
  created_at: string;
  email: string;
  username: string;
  user_name: string;
}

function MembershipSection() {
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [tiers, setTiers] = useState<{ name: string }[]>([]);
  const [form, setForm] = useState({ tier: "", start_date: "", duration_value: "", duration_unit: "months" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMemberships = () => {
    setLoading(true);
    fetch(`/api/config/memberships?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.rows || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => { setError("Gagal memuat."); setLoading(false); });
  };

  const fetchTiers = () => {
    fetch("/api/config/tiers")
      .then((r) => r.json())
      .then((d) => setTiers(d.map((t: any) => ({ name: t.name }))))
      .catch(console.error);
  };

  useEffect(() => { fetchMemberships(); fetchTiers(); }, [page]);

  const searchUsers = (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    fetch(`/api/config/users?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setUserResults(d || []))
      .catch(console.error);
  };

  const handleCreate = async () => {
    if (!selectedUser) { alert("Pilih user terlebih dahulu."); return; }
    if (!form.tier) { alert("Pilih tier."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/config/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          tier: form.tier,
          start_date: form.start_date || undefined,
          duration_value: form.duration_value || undefined,
          duration_unit: form.duration_unit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      setSelectedUser(null);
      setUserSearch("");
      setUserResults([]);
      setForm({ tier: "", start_date: "", duration_value: "", duration_unit: "months" });
      setPage(1);
      fetchMemberships();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cabut membership ini?")) return;
    try {
      const res = await fetch(`/api/config/memberships/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchMemberships();
    } catch (e: any) { alert(e.message); }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <p className="text-sm text-slate-500">Kelola membership user — assign tier dengan periode berlaku.</p>
          <button onClick={() => { setShowForm(!showForm); setError(""); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            {showForm ? "Batal" : "+ Assign Membership"}
          </button>
        </div>

        {showForm && (
          <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
            <p className="text-sm font-medium text-slate-700">Assign Membership Baru</p>

            {/* User search */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cari User (email atau username)</label>
              <input type="text" placeholder="Ketik min. 2 karakter..."
                value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); searchUsers(e.target.value); }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              {userResults.length > 0 && !selectedUser && (
                <div className="border border-slate-200 rounded-lg mt-1 bg-white shadow-sm max-h-40 overflow-y-auto">
                  {userResults.map((u) => (
                    <button key={u.id} onClick={() => { setSelectedUser(u); setUserSearch(u.email); setUserResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0">
                      <span className="font-medium">{u.email}</span>
                      <span className="text-slate-400 ml-2">{u.username !== u.email ? `(@${u.username})` : ""}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && <p className="text-xs text-green-600 mt-1">✓ {selectedUser.email} dipilih</p>}
            </div>

            {/* Tier */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tier</label>
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">Pilih tier...</option>
                {tiers.map((t) => <option key={t.name} value={t.name}>{t.name.charAt(0).toUpperCase() + t.name.slice(1)}</option>)}
              </select>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Mulai (kosong = hari ini)</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Durasi Berlangganan</label>
              <div className="flex gap-2">
                <input type="number" min="1" placeholder="1" value={form.duration_value}
                  onChange={(e) => setForm({ ...form, duration_value: e.target.value })}
                  className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                <select value={form.duration_unit}
                  onChange={(e) => setForm({ ...form, duration_unit: e.target.value })}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="months">Bulan</option>
                  <option value="years">Tahun</option>
                </select>
                <span className="text-sm text-slate-500 self-center">× {form.duration_value} {form.duration_unit === "months" ? "bulan" : "tahun"}</span>
              </div>
              {form.duration_value && form.tier && (
                <p className="text-xs text-slate-400 mt-1">
                  Akan berakhir: {(() => {
                    const start = form.start_date ? new Date(form.start_date) : new Date();
                    const d = parseInt(form.duration_value);
                    const end = new Date(start);
                    if (form.duration_unit === "months") end.setMonth(end.getMonth() + d);
                    else end.setFullYear(end.getFullYear() + d);
                    end.setDate(end.getDate() - 1);
                    return end.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
                  })()}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button onClick={handleCreate} disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan Membership"}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Tier</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Mulai</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Berakhir</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr> :
               rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Belum ada membership.</td></tr> :
               rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{m.email}</div>
                    {m.user_name && <div className="text-xs text-slate-400">{m.user_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      {m.tier.charAt(0).toUpperCase() + m.tier.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{fmtDate(m.start_date)}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{fmtDate(m.end_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(m.id)}
                      className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">Cabut</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 text-sm text-slate-500 text-center">
          Total: {total} membership
        </div>
      </div>
    </div>
  );
}

function TierHistorySection() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userQ, setUserQ] = useState("");
  const [action, setAction] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

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
    if (row.from_tier && row.to_tier && row.from_tier !== row.to_tier) parts.push(`${row.from_tier} → ${row.to_tier}`);
    if (row.from_role && row.to_role && row.from_role !== row.to_role) parts.push(`role: ${row.from_role} → ${row.to_role}`);
    return parts.join(", ") || "—";
  };

  const isUpgrade = (row: HistoryRow) => row.from_tier === "free" && row.to_tier === "premium";
  const isDowngrade = (row: HistoryRow) => row.from_tier === "premium" && row.to_tier === "free";

  const fmt = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm text-slate-500">Riwayat perubahan tier dan role setiap user. Hanya webmaster yang bisa melihat.</p>
      </div>
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-3">
        <input type="text" placeholder="Filter by user email..." value={userQ}
          onChange={(e) => setUserQ(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">Semua</option>
          <option value="upgrade">Upgrade</option>
          <option value="downgrade">Downgrade</option>
        </select>
      </div>

      {loading ? <div className="p-8 text-center text-slate-400">Memuat...</div>
       : rows.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">Belum ada riwayat perubahan.</div>
       : (
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
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isUpgrade(row) ? "bg-green-100 text-green-700" : isDowngrade(row) ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
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

// ─── Main page ───────────────────────────────────────────────────

export default function ConfigPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tiers" | "limits" | "memberships" | "users" | "history">("tiers");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config/limits")
      .then((r) => {
        if (r.status === 403) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then(() => setLoading(false))
      .catch(() => { router.push("/dashboard"); });
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

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["tiers", "limits", "memberships", "users", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab === "tiers" ? "Tier" : tab === "limits" ? "Tier Limits" : tab === "memberships" ? "Membership" : tab === "users" ? "Manajemen User" : "Riwayat Tier"}
          </button>
        ))}
      </div>

      {activeTab === "tiers" ? <TierSection /> :
       activeTab === "limits" ? <LimitsSection /> :
       activeTab === "memberships" ? <MembershipSection /> :
       activeTab === "users" ? <UserManagementSection /> :
       <TierHistorySection />}
    </div>
  );
}
