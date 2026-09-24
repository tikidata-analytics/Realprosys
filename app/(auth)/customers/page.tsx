"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, parseSort, toggleSort } from "@/lib/formatters";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  created_at: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", birth_date: "", gender: "" });
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("created_at:desc");
  const [page, setPage] = useState(1);
  const [atLimit, setAtLimit] = useState(false);
  const [limit, setLimit] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearch, page, sort]);

  const fetchCustomers = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      sort,
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    });
    const r = await fetch(`/api/customers?${params}`);
    const data = await r.json();
    setCustomers(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);

    // Check limit
    const me = await fetch("/api/auth/me").then(r => r.json()).catch(() => null);
    if (me?.user?.id) {
      const limits = await fetch("/api/config/limits").then(r => r.json()).catch(() => []);
      const userTier = me.user.tier || "free";
      const userRole = me.user.role || "user";
      if (userRole === "webmaster") {
        setAtLimit(false);
        setLimit(Infinity);
      } else {
        const myLimit = limits.find((l: any) => l.tier === userTier && l.resource === "customers");
        const limitVal = myLimit?.limit_val ?? 0;
        setLimit(limitVal);
        setAtLimit((data.total || 0) >= limitVal && limitVal > 0);
      }
    }
    setLoading(false);
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", birth_date: c.birth_date || "", gender: c.gender || "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const url = editId ? `/api/customers/${editId}` : "/api/customers";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      setForm({ name: "", email: "", phone: "", birth_date: "", gender: "" });
      setShowForm(false);
      setEditId(null);
      fetchCustomers();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pelanggan ini?")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    fetchCustomers();
  };

  const cancelForm = () => {
    setForm({ name: "", email: "", phone: "", birth_date: "", gender: "" });
    setShowForm(false);
    setEditId(null);
  };

  const handleSort = (field: string) => {
    setSort(toggleSort(sort, field));
    setPage(1);
  };

  const sortIcon = (field: string) => {
    const { orderBy, orderDir } = parseSort(sort);
    if (orderBy !== field) return <span className="text-xs text-slate-300">↕</span>;
    return <span className="text-xs text-indigo-600">{orderDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Pelanggan</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Cari nama, telepon, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); setPage(1); }}}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-64"
          />
          <button onClick={() => { setEditId(null); setShowForm(!showForm); }}
            disabled={atLimit}
            title={atLimit ? `Limit ${limit} tercapai. Upgrade ke Premium untuk menambah.` : ""}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {showForm && !editId ? "Batal" : "+ Tambah"}
          </button>
        </div>
      </div>

      {atLimit && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Anda已达到 limit <strong>{total}/{limit}</strong> pelanggan. Upgrade ke Premium untuk menambah.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input type="text" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="text" placeholder="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Gender:</label>
            <label className="flex items-center gap-1"><input type="radio" name="gender" value="LAKI" checked={form.gender === "LAKI"} onChange={(e) => setForm({ ...form, gender: e.target.value })} /> Laki-laki</label>
            <label className="flex items-center gap-1"><input type="radio" name="gender" value="PEREMPUAN" checked={form.gender === "PEREMPUAN"} onChange={(e) => setForm({ ...form, gender: e.target.value })} /> Perempuan</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">{loading ? "Menyimpan..." : "Simpan"}</button>
            <button type="button" onClick={cancelForm} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition">Batal</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {debouncedSearch
              ? `Tidak ada pelanggan yang cocok dengan "${debouncedSearch}"`
              : "Belum ada pelanggan"}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("name")}>
                    <span className="flex items-center gap-1">Nama {sortIcon("name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("email")}>
                    <span className="flex items-center gap-1">Email {sortIcon("email")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("gender")}>
                    <span className="flex items-center gap-1">Gender {sortIcon("gender")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("phone")}>
                    <span className="flex items-center gap-1">Telepon {sortIcon("phone")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("birth_date")}>
                    <span className="flex items-center gap-1">Tgl Lahir {sortIcon("birth_date")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("created_at")}>
                    <span className="flex items-center gap-1">Dibuat {sortIcon("created_at")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{c.gender === "LAKI" ? "Laki-laki" : c.gender === "PEREMPUAN" ? "Perempuan" : "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.birth_date)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => router.push(`/schemes/new?customer_id=${c.id}`)} className="px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg mr-1">Skema</button>
                      <button onClick={() => openEdit(c)} className="px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg mr-1">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-500">
              <span>{(page - 1) * 10 + 1}–{Math.min(page * 10, total)} dari {total}</span>
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
