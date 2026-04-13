"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard Real", href: "/master" },
  { label: "Gateway", href: "/master/gateway" },
  { label: "Atribuir Números", href: "/master/atribuir" },
];

function Fake404() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white">404</h1>
        <p className="text-gray-400 mt-2">This page could not be found.</p>
      </div>
    </div>
  );
}

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/master/login") {
      setAuthorized(true);
      setChecked(true);
      return;
    }
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && (role === "master" || role === "MASTER")) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
    }
    setChecked(true);
  }, [pathname]);

  if (!checked) return null;

  if (!authorized) return <Fake404 />;

  if (pathname === "/master/login") {
    return <>{children}</>;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-red-900/30 flex flex-col">
        <div className="px-6 py-5 border-b border-red-900/30">
          <h2 className="text-lg font-bold text-red-400">Master Panel</h2>
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
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-red-900/30">
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
