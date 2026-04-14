"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (pathname === "/admin/login") return;
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || (role !== "admin" && role !== "ADMIN" && role !== "master" && role !== "MASTER")) {
      router.replace("/admin/login");
    }
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Admin</h2>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-600/20 transition-colors text-left"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">{children}</main>

    </div>
  );
}
