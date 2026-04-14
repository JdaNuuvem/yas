"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function AdminSorteioRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/configuracao"); }, [router]);
  return null;
}
