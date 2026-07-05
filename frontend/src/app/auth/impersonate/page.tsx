"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/stores/session";
import { Loader2 } from "lucide-react";

import { Suspense } from "react";

function ImpersonateLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSession(s => s.setSession);

  useEffect(() => {
    const token = searchParams.get("token");
    const userStr = searchParams.get("user");
    
    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        setSession(user, token);
        // Force reload to ensure all state/query caches are fresh for the new user
        window.location.href = "/admin";
      } catch(e) {
        console.error("Failed to parse impersonate user", e);
        router.push("/auth/login");
      }
    } else {
      router.push("/auth/login");
    }
  }, [router, searchParams, setSession]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
      <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
      <p className="text-stone-500 font-medium">Starting impersonation session...</p>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-brand mb-4" /></div>}>
      <ImpersonateLogic />
    </Suspense>
  );
}
