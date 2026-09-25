"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role?: string; tier?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = () => {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (!data.user) {
            router.push("/login");
          } else {
            setUser(data.user);
            setLoading(false);
          }
        })
        .catch(() => router.push("/login"));
    };

    fetchUser();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchUser();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  const isWebmaster = user?.role === "webmaster";
  const isFree = user?.tier === "free";

  const menuItems = [
    { href: "/customers", label: "Pelanggan" },
    { href: "/projects", label: "Proyek" },
    { href: "/products", label: "Produk" },
    { href: "/payment-plans", label: "Rencana Bayar" },
    { href: "/schemes", label: "Skema" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/">
                <h1 className="text-lg font-bold text-indigo-900 cursor-pointer">Realprosys</h1>
              </Link>
              <p className="text-xs text-slate-400">KPR Scheme Generator</p>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard"
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                Dashboard
              </Link>

              {/* Menu dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Menu
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                    <Link href="/profile" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 border-b border-slate-100 hover:bg-indigo-50">
                      <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 capitalize">
                        {user?.tier ?? "free"}
                      </span>
                    </Link>
                    {menuItems.map(({ href, label }) => (
                      <Link key={href} href={href}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                        {label}
                      </Link>
                    ))}
                    {isWebmaster && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <Link href="/config"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                          Konfigurasi
                        </Link>
                      </>
                    )}
                    <div className="border-t border-slate-100 my-1" />
                    <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      Keluar
                    </button>
                  </div>
                )}
              </div>

              <Link href="/schemes/new"
                className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm">
                + Skema
              </Link>
              {isFree && !isWebmaster && (
                <Link href="/upgrade"
                  className="px-4 py-2 text-sm font-bold bg-amber-400 text-amber-900 rounded-lg hover:bg-amber-500 transition shadow-sm">
                  Upgrade
                </Link>
              )}
            </nav>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden pt-3 pb-1 flex flex-col gap-1 border-t border-slate-100 mt-3">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 rounded-lg">
                Dashboard
              </Link>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 hover:bg-indigo-50">
                  <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 capitalize">
                    {user?.tier ?? "free"}
                  </span>
                </Link>
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Menu</div>
              {menuItems.map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                  className="px-6 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded-lg">
                  {label}
                </Link>
              ))}
              {isWebmaster && (
                <Link href="/config" onClick={() => setMobileMenuOpen(false)}
                  className="px-6 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded-lg">
                  Konfigurasi
                </Link>
              )}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <Link href="/schemes/new" onClick={() => setMobileMenuOpen(false)}
                  className="mx-3 px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg text-center block">
                  + Skema
                </Link>
                {isFree && !isWebmaster && (
                  <Link href="/upgrade" onClick={() => setMobileMenuOpen(false)}
                    className="mx-3 my-1 px-4 py-2 text-sm font-bold bg-amber-400 text-amber-900 rounded-lg text-center block">
                    Upgrade
                  </Link>
                )}
              </div>
              <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="mx-3 my-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg text-left">
                Keluar
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
