"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((data) => {
        setName(data.name || "");
        setUsername(data.username || "");
        setEmail(data.email || "");
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal update");
      } else {
        setSuccess(true);
        if (username && username !== data.user.username) {
          setUsername(data.user.username);
        }
      }
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Gagal ubah password");
      } else {
        setPwSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch {
      setPwError("Koneksi gagal.");
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <a href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">← Dashboard</a>
        <h2 className="text-xl font-bold text-slate-900 mt-2">Edit Profil</h2>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">
            Profil berhasil diupdate ✅
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username <span className="text-red-500">*</span></label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="contoh: budi_agent"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" />
            <p className="text-xs text-slate-400 mt-1">3-20 karakter, huruf, angka, underscore</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={email} disabled
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed" />
            <p className="text-xs text-slate-400 mt-1">Email tidak bisa diubah</p>
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </div>

      {/* Password Change Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-4 space-y-5">
        <h3 className="text-sm font-semibold text-slate-700">Ubah Password</h3>
        {pwSuccess && (
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">
            Password berhasil diubah ✅
          </div>
        )}
        {pwError && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
            {pwError}
          </div>
        )}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password Lama</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              required minLength={8}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <p className="text-xs text-slate-400 mt-1">Min 8 karakter, harus ada huruf dan angka</p>
          </div>
          <button type="submit" disabled={pwSaving}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50">
            {pwSaving ? "Menyimpan..." : "Ubah Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
