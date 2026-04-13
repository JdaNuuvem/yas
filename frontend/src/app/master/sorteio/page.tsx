"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MasterSorteioPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/sorteio");
  }, [router]);

  return (
    <div className="text-gray-400 text-center py-20">Redirecionando...</div>
  );
}
