"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Settings, Megaphone, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SuperAdminSettingsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isActive, setIsActive] = useState(true);

  const { data: currentAnn } = useQuery({
    queryKey: ["current-announcement"],
    queryFn: () => api<{ announcement: any }>("/api/announcements"),
  });

  const postMut = useMutation({
    mutationFn: (payload: any) => api("/api/super-admin/announcements", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      toast.success("Announcement posted successfully!");
      setTitle("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["current-announcement"] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-clay" />
          Platform Settings
        </h1>
        <p className="text-stone text-sm">Global configurations for SmartDine.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-bone space-y-6">
        <div className="flex items-center gap-2 border-b border-bone pb-4">
          <Megaphone className="h-5 w-5 text-clay" />
          <h2 className="font-heading font-semibold text-lg">Global Announcement</h2>
        </div>

        {currentAnn?.announcement && (
          <div className="p-4 bg-sand rounded-lg border border-bone text-sm mb-6">
            <p className="font-semibold text-ink mb-1">Currently Active:</p>
            <p className="text-stone">{currentAnn.announcement.title}</p>
          </div>
        )}

        <form onSubmit={(e) => {
          e.preventDefault();
          postMut.mutate({ title, message, type, is_active: isActive });
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Title</label>
            <input 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-clay/30 outline-none" 
              placeholder="e.g. Scheduled Maintenance"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Message</label>
            <textarea 
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-clay/30 outline-none h-24" 
              placeholder="Details of the announcement..."
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-ink mb-1">Type</label>
              <select 
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-clay/30 outline-none bg-white"
              >
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Yellow)</option>
              </select>
            </div>
            <div className="flex-1 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input 
                  type="checkbox" 
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded border-bone text-clay focus:ring-clay/30"
                />
                <span className="text-sm text-ink">Set as Active</span>
              </label>
            </div>
          </div>
          <button 
            type="submit"
            disabled={postMut.isPending}
            className="w-full bg-clay hover:bg-clay-dark text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Post Announcement
          </button>
        </form>
      </div>
    </div>
  );
}
