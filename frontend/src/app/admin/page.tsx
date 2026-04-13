"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/configuracao");
  }, [router]);

  return (
    <div className="text-gray-400 text-center py-20">Redirecionando...</div>
  );
}
