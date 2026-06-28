"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save, UserCog, Key, Settings, Palette, Type, Link as LinkIcon, Upload, Loader2, Eye, EyeOff } from "lucide-react";
import { useSession } from "@/stores/session";

export default function AdminSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api<any>("/api/admin/settings"),
  });

  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => api<{ staff: any[] }>("/api/admin/staff"),
  });

  // Settings State
  const [name, setName] = useState(settings?.name || "");
  const [tagline, setTagline] = useState(settings?.tagline || "");
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color || "var(--brand-primary)");
  const [secondaryColor, setSecondaryColor] = useState(settings?.secondary_color || "var(--brand-secondary)");
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || "");
  const [upiId, setUpiId] = useState(settings?.upi_id || "");
  const [paymentQrUrl, setPaymentQrUrl] = useState(settings?.payment_qr_url || "");
  const [uploadingQr, setUploadingQr] = useState(false);

  // Add Staff form state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffRole, setNewStaffRole] = useState<"kitchen" | "counter">("kitchen");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");

  // Update effect to prefill from fetched data
  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setTagline(settings.tagline || "");
      setPrimaryColor(settings.primary_color || "var(--brand-primary)");
      setSecondaryColor(settings.secondary_color || "var(--brand-secondary)");
      setLogoUrl(settings.logo_url || "");
      setUpiId(settings.upi_id || "");
      setPaymentQrUrl(settings.payment_qr_url || "");
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data: any) => api("/api/admin/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Brand settings updated successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update settings"),
  });

  const addStaff = useMutation({
    mutationFn: (data: { role: string; name: string; password?: string }) =>
      api("/api/admin/staff", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Staff added");
      setShowAddStaff(false);
      setNewStaffName("");
      setNewStaffPassword("");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add staff"),
  });

  const handleSaveSettings = () => {
    updateSettings.mutate({ 
      name, tagline, 
      primary_color: primaryColor, secondary_color: secondaryColor, 
      logo_url: logoUrl,
      upi_id: upiId, payment_qr_url: paymentQrUrl
    });
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingQr(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      // Use direct fetch to let browser set multipart/form-data with boundary
      const token = useSession.getState().token;
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to upload image");
      const json = await res.json();
      setPaymentQrUrl(json.url);
      toast.success("QR Code uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingQr(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-ink">Brand & Staff Settings</h1>
        <p className="text-stone mt-1">Manage your restaurant identity and staff access.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="bg-white border border-bone rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="h-5 w-5 text-ink" />
            <h2 className="text-xl font-heading font-semibold text-ink">Brand Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Restaurant Name</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <Type className="h-4 w-4 text-stone" />
                <input value={name} onChange={e => setName(e.target.value)} className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Tagline</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <Type className="h-4 w-4 text-stone" />
                <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Turn Every Meal Into A Memory" className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Logo URL</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <LinkIcon className="h-4 w-4 text-stone" />
                <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-stone block mb-1">Primary Color</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                  <span className="text-sm text-ink">{primaryColor}</span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone block mb-1">Secondary Color</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                  <span className="text-sm text-ink">{secondaryColor}</span>
                </div>
              </label>
            </div>
            
            <button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="mt-4 w-full bg-ink text-cream font-medium rounded-xl px-4 py-2 hover:opacity-90 flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> Save Brand Settings
            </button>
          </div>
        </section>

        <section className="bg-white border border-bone rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Key className="h-5 w-5 text-ink" />
            <h2 className="text-xl font-heading font-semibold text-ink">Payment Options</h2>
          </div>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">UPI ID</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <Type className="h-4 w-4 text-stone" />
                <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. mehfil@upi" className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Custom Payment QR Image</span>
              
              <div className="space-y-3">
                {paymentQrUrl ? (
                  <div className="relative inline-block border border-bone rounded-xl overflow-hidden p-2 bg-cream">
                    <img src={paymentQrUrl} alt="Uploaded QR" className="h-24 w-24 object-contain" />
                    <button 
                      onClick={() => setPaymentQrUrl("")} 
                      className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-alert shadow-sm border border-bone hover:bg-alert/10"
                      title="Remove image"
                    >
                      <Type className="h-3 w-3 rotate-45" />
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <label className="flex items-center justify-center gap-2 bg-cream border border-bone border-dashed rounded-xl px-4 py-3 cursor-pointer hover:bg-stone/5 transition-colors flex-1">
                    {uploadingQr ? (
                      <Loader2 className="h-4 w-4 text-stone animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 text-stone" />
                    )}
                    <span className="text-sm text-stone font-medium">
                      {uploadingQr ? "Uploading..." : "Upload QR Image"}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleQrUpload} 
                      disabled={uploadingQr}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs text-stone mt-2">If provided, this image will be shown to customers instead of auto-generating a QR code from the UPI ID.</p>
            </label>
            
            <button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="mt-4 w-full bg-ink text-cream font-medium rounded-xl px-4 py-2 hover:opacity-90 flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> Save Payment Settings
            </button>
          </div>
        </section>

        <section className="bg-white border border-bone rounded-2xl p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <UserCog className="h-5 w-5 text-ink" />
            <h2 className="text-xl font-heading font-semibold text-ink">Staff Access</h2>
          </div>

          <div className="space-y-6">
            {loadingStaff ? (
              <div className="text-stone text-sm">Loading staff...</div>
            ) : staffData?.staff?.length === 0 ? (
              <div className="text-stone text-sm italic">No staff accounts found.</div>
            ) : (
              staffData?.staff?.map((s) => (
                <StaffRow key={s.id} staff={s} />
              ))
            )}
          </div>

          <button
            onClick={() => setShowAddStaff(!showAddStaff)}
            className="mt-4 text-sm font-medium text-electric-blue hover:text-electric-blue/80 transition"
          >
            {showAddStaff ? "− Cancel" : "+ Add Staff Member"}
          </button>

          {showAddStaff && (
            <div className="mt-3 p-4 bg-cream border border-bone rounded-xl space-y-3">
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as "kitchen" | "counter")}
                className="w-full bg-white border border-bone rounded-lg px-3 py-2 text-sm outline-none text-ink"
              >
                <option value="kitchen">Kitchen</option>
                <option value="counter">Counter</option>
              </select>
              <input
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Staff name"
                className="w-full bg-white border border-bone rounded-lg px-3 py-2 text-sm outline-none text-ink"
              />
              <input
                value={newStaffPassword}
                onChange={(e) => setNewStaffPassword(e.target.value)}
                placeholder="Password (auto-generated if blank)"
                className="w-full bg-white border border-bone rounded-lg px-3 py-2 text-sm outline-none text-ink"
              />
              <button
                onClick={() => addStaff.mutate({
                  role: newStaffRole,
                  name: newStaffName,
                  password: newStaffPassword || undefined,
                })}
                disabled={!newStaffName.trim() || addStaff.isPending}
                className="w-full bg-ink text-cream font-medium rounded-lg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Staff"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StaffRow({ staff }: { staff: any }) {
  const qc = useQueryClient();
  const [name, setName] = useState(staff.name);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sync name from server when staff data refetches
  useEffect(() => {
    setName(staff.name);
  }, [staff.name]);

  const updateStaff = useMutation({
    mutationFn: (data: any) => api("/api/admin/staff", { method: "POST", body: JSON.stringify({ ...data, id: staff.id, role: staff.role }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success(`${staff.role} credentials updated`);
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const deleteStaff = useMutation({
    mutationFn: () => api(`/api/admin/staff/${staff.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success(`${staff.name} deleted`);
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  return (
    <div className="border-b border-bone pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-ink capitalize">{staff.role}</span>
        <span className="text-xs text-stone">{staff.email}</span>
      </div>
      <div className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" className="w-full bg-cream border border-bone rounded-xl px-3 py-1.5 text-sm outline-none text-ink" />
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-1.5 flex-1 relative">
            <Key className="h-3 w-3 text-stone shrink-0" />
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="New Password (leave blank to keep)" className="bg-transparent outline-none flex-1 text-sm text-ink pr-8" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone hover:text-ink transition"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={() => updateStaff.mutate({ name, password: password || undefined })} className="bg-ink text-cream font-medium text-xs px-4 rounded-xl hover:opacity-90 shrink-0">
            {updateStaff.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Update"}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${staff.name} (${staff.role})?`))
                deleteStaff.mutate();
            }}
            disabled={deleteStaff.isPending}
            className="text-alert text-xs font-medium px-2 rounded-xl hover:bg-alert/10 shrink-0 transition"
          >
            {deleteStaff.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
