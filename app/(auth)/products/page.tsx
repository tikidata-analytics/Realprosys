"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, parseSort, toggleSort } from "@/lib/formatters";

interface Project {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  type: string;
  price: string;
  project_id: string;
  project_name: string | null;
  land_area: number | null;
  building_area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "RUMAH", price: "", project_id: "", land_area: "", building_area: "", bedrooms: "", bathrooms: "" });
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

  useEffect(() => { fetchProducts(); }, [debouncedSearch, page, sort]);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    const r = await fetch("/api/projects?page=1&sort=name:asc");
    const data = await r.json();
    setProjects(data.rows || []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      sort,
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    });
    const r = await fetch(`/api/products?${params}`);
    const data = await r.json();
    setProducts(data.rows || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);

    const me = await fetch("/api/auth/me").then(r => r.json()).catch(() => null);
    if (me?.user?.id) {
      const limits = await fetch("/api/config/limits").then(r => r.json()).catch(() => []);
      const userTier = me.user.tier || "free";
      const userRole = me.user.role || "user";
      if (userRole === "webmaster") {
        setAtLimit(false);
        setLimit(Infinity);
      } else {
        const myLimit = limits.find((l: any) => l.tier === userTier && l.resource === "products");
        const limitVal = myLimit?.limit_val ?? 0;
        setLimit(limitVal);
        setAtLimit((data.total || 0) >= limitVal && limitVal > 0);
      }
    }
    setLoading(false);
  };

  const handleSort = (field: string) => {
    setSort(toggleSort(sort, field));
    setPage(1);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, type: p.type, price: String(p.price),
      project_id: p.project_id,
      land_area: String(p.land_area || ""),
      building_area: String(p.building_area || ""),
      bedrooms: String(p.bedrooms || ""),
      bathrooms: String(p.bathrooms || ""),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const url = editId ? `/api/products/${editId}` : "/api/products";
    const method = editId ? "PUT" : "POST";
    const payload = {
      ...form,
      price: Number(form.price),
      land_area: Number(form.land_area),
      building_area: Number(form.building_area),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
    };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      resetForm();
      fetchProducts();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", type: "RUMAH", price: "", project_id: "", land_area: "", building_area: "", bedrooms: "", bathrooms: "" });
    setShowForm(false);
    setEditId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  const sortIcon = (field: string) => {
    const { orderBy, orderDir } = parseSort(sort);
    if (orderBy !== field) return <span className="text-xs text-slate-300">↕</span>;
    return <span className="text-xs text-indigo-600">{orderDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Produk</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Cari nama, proyek..."
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
          Anda已达到 limit <strong>{total}/{limit}</strong> produk. Upgrade ke Premium untuk menambah.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input type="text" placeholder="Nama produk" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="">-- Pilih Proyek --</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="RUMAH">Rumah</option>
              <option value="APARTEMEN">Apartemen</option>
            </select>
            <input type="number" placeholder="Harga (Rp)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="number" placeholder="Luas Tanah (m²)" value={form.land_area} onChange={(e) => setForm({ ...form, land_area: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="number" placeholder="Luas Bangunan (m²)" value={form.building_area} onChange={(e) => setForm({ ...form, building_area: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="number" placeholder="Kamar Tidur" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="number" placeholder="Kamar Mandi" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} required
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">{loading ? "Menyimpan..." : "Simpan"}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition">Batal</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Belum ada produk</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("name")}>
                    <span className="flex items-center gap-1">Nama {sortIcon("name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("project_name")}>
                    <span className="flex items-center gap-1">Proyek {sortIcon("project_name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tipe</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("price")}>
                    <span className="flex items-center justify-end gap-1">Harga {sortIcon("price")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("building_area")}>
                    <span className="flex items-center justify-end gap-1">LB/LT {sortIcon("building_area")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">KT/KM</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p: Product) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.project_name || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === "RUMAH" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{p.building_area}/{p.land_area}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{p.bedrooms}/{p.bathrooms}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => router.push(`/schemes/new?product_id=${p.id}`)} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mr-1">+ Skema</button>
                      <button onClick={() => openEdit(p)} className="px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg mr-1">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">Hapus</button>
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
