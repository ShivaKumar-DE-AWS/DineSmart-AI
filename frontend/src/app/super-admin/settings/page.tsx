"use client";
import { Settings } from "lucide-react";

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-brand" />
          Platform Settings
        </h1>
        <p className="text-stone text-sm">Global configurations for SmartDine.</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-bone">
        <div className="text-center py-12">
          <Settings className="h-12 w-12 text-stone opacity-20 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-ink text-lg">Coming Soon</h3>
          <p className="text-stone text-sm max-w-sm mx-auto mt-2">
            Platform-wide feature flags, webhooks, and billing configuration will be available in V2.
          </p>
        </div>
      </div>
    </div>
  );
}
