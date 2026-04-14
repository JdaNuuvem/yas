"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Configuração", href: "/admin/configuracao" },
  { label: "Prêmios", href: "/admin/premios" },
  { label: "Buscar Número", href: "/admin/buscar" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || (role !== "admin" && role !== "ADMIN" && role !== "master" && role !== "MASTER")) {
      router.replace("/admin/login");
    }
  }, [pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white">Admin</h2>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-gray-400 p-2"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {menuOpen
              ? <path d="M18 6L6 18M6 6l12 12" />
              : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="w-64 h-full bg-gray-900 border-r border-gray-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Admin</h2>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-gray-800">
              <button onClick={handleLogout} className="w-full px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-600/20 transition-colors text-left">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 bg-gray-900 border-r border-gray-800 flex-col min-h-screen">
          <div className="px-6 py-5 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Admin</h2>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-gray-800">
            <button onClick={handleLogout} className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-600/20 transition-colors text-left">
              Sair
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen">{children}</main>
      </div>
    </div>
  );
}
