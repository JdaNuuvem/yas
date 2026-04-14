"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminAtribuirRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/configuracao"); }, [router]);
  return null;
}
