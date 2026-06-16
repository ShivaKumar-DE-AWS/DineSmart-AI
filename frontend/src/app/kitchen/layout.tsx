"use client";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { useSession } from "@/stores/session";
import { useRouter } from "next/navigation";
import { LogOut, ChefHat } from "lucide-react";

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, clear } = useSession();
  return (
    <RoleGuard allow={["kitchen", "admin"]}>
      <div className="theme-dark-ops min-h-screen bg-coal text-white">
        <header className="border-b border-slate px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-alert flex items-center justify-center"><ChefHat className="h-5 w-5 text-white" /></div>
            <div>
              <div className="font-heading font-semibold leading-tight">SmartDine Kitchen</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider" data-testid="kitchen-user">{user?.name}</div>
            </div>
          </div>
          <button data-testid="kitchen-logout" onClick={() => { clear(); router.push("/"); }} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <LogOut className="h-4 w-4" /> Exit
          </button>
        </header>
        <main className="p-4">{children}</main>
      </div>
    </RoleGuard>
  );
}
