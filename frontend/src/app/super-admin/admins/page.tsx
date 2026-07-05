"use client";
import { ShieldCheck, Plus, UserCircle2, Mail, Trash2 } from "lucide-react";
import { useState } from "react";

export default function SuperAdminAdminsPage() {
  const admins = [
    { id: "sa_1", name: "System Administrator", email: "admin@smartdine.ai", role: "Owner", last_active: "Just now" },
    { id: "sa_2", name: "Support Team", email: "support@smartdine.ai", role: "Support", last_active: "2 hours ago" },
    { id: "sa_3", name: "Billing Manager", email: "billing@smartdine.ai", role: "Finance", last_active: "1 day ago" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand" />
            Super Admins
          </h1>
          <p className="text-stone text-sm">Manage users with platform-wide access.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 transition shadow-sm">
          <Plus className="h-4 w-4" /> Invite Admin
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-bone overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-sand text-stone font-medium border-b border-bone">
              <th className="py-3 px-4">Admin Name</th>
              <th className="py-3 px-4">Role / Permissions</th>
              <th className="py-3 px-4">Last Active</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-sand/50 transition">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                      {admin.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-ink">{admin.name}</div>
                      <div className="text-stone text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> {admin.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    admin.role === 'Owner' ? 'bg-purple-100 text-purple-800' :
                    admin.role === 'Support' ? 'bg-blue-100 text-blue-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {admin.role}
                  </span>
                </td>
                <td className="py-4 px-4 text-stone">{admin.last_active}</td>
                <td className="py-4 px-4 text-right">
                  <button 
                    disabled={admin.role === 'Owner'}
                    className="p-2 text-stone hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
