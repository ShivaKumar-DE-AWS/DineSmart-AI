"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save, UserCog, Key, Settings, Palette, Type, Link as LinkIcon, Upload, Loader2, Eye, EyeOff, ShieldAlert, Phone, MapPin, Mail, Globe, Clock, Check } from "lucide-react";
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

  // Contact Info State
  const [phone, setPhone] = useState(settings?.phone || "");
  const [address, setAddress] = useState(settings?.address || "");
  const [email, setEmail] = useState(settings?.email || "");
  const [website, setWebsite] = useState(settings?.website || "");

  // Logo Upload State
  const [logoMode, setLogoMode] = useState<"url" | "upload">("url");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Operating Hours State
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const defaultHours = DAYS.reduce((acc, day) => {
    acc[day] = { open: true, openTime: "09:00", closeTime: "22:00" };
    return acc;
  }, {} as any);
  const [hours, setHours] = useState<any>(settings?.operating_hours || defaultHours);

  // Add Staff form state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffRole, setNewStaffRole] = useState<"kitchen" | "counter" | "cashier">("kitchen");
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
      
      setPhone(settings.phone || "");
      setAddress(settings.address || "");
      setEmail(settings.email || "");
      setWebsite(settings.website || "");

      if (settings.operating_hours) {
        setHours(settings.operating_hours);
      }
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
      upi_id: upiId, payment_qr_url: paymentQrUrl,
      phone, address, email, website,
      operating_hours: hours
    });
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingQr(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const token = useSession.getState().token;
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to upload image");
      const json = await res.json();
      setLogoUrl(json.url);
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHourChange = (day: string, field: string, value: any) => {
    setHours((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-ink">Brand & Settings</h1>
        <p className="text-stone mt-1">Manage your restaurant identity, contact details, and staff access.</p>
      </div>

      {(settings?.is_verified === false || settings?.sandbox_mode === true) && (
        <VerificationSection />
      )}

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
              <span className="text-sm font-medium text-stone block mb-3">Logo</span>
              
              <div className="flex bg-cream border border-bone rounded-lg p-1 mb-3">
                <button
                  type="button"
                  onClick={() => setLogoMode("url")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${logoMode === "url" ? "bg-white shadow-sm text-ink" : "text-stone hover:text-ink"}`}
                >
                  <LinkIcon className="h-3.5 w-3.5" /> Enter URL
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode("upload")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${logoMode === "upload" ? "bg-white shadow-sm text-ink" : "text-stone hover:text-ink"}`}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload File
                </button>
              </div>

              {logoMode === "url" ? (
                <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                  <LinkIcon className="h-4 w-4 text-stone" />
                  <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." className="bg-transparent outline-none flex-1 text-ink" />
                </div>
              ) : (
                <div className="space-y-3">
                  {logoUrl && (
                    <div className="relative inline-block border border-bone rounded-xl overflow-hidden p-2 bg-cream">
                      <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
                      <button 
                        onClick={() => setLogoUrl("")} 
                        className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-alert shadow-sm border border-bone hover:bg-alert/10"
                        title="Remove image"
                      >
                        <Type className="h-3 w-3 rotate-45" />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 bg-cream border border-bone border-dashed rounded-xl px-4 py-3 cursor-pointer hover:bg-stone/5 transition-colors">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 text-stone animate-spin" /> : <Upload className="h-4 w-4 text-stone" />}
                    <span className="text-sm text-stone font-medium">{uploadingLogo ? "Uploading..." : "Upload Logo Image"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                  </label>
                </div>
              )}
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
            <Phone className="h-5 w-5 text-ink" />
            <h2 className="text-xl font-heading font-semibold text-ink">Contact Info</h2>
          </div>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Phone Number</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <Phone className="h-4 w-4 text-stone" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Address</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <MapPin className="h-4 w-4 text-stone" />
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main Street, Hyderabad" className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Email Address</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <Mail className="h-4 w-4 text-stone" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="info@yourrestaurant.com" className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone block mb-1">Website URL</span>
              <div className="flex items-center gap-2 bg-cream border border-bone rounded-xl px-3 py-2">
                <Globe className="h-4 w-4 text-stone" />
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourrestaurant.com" className="bg-transparent outline-none flex-1 text-ink" />
              </div>
            </label>

            <button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="mt-4 w-full bg-ink text-cream font-medium rounded-xl px-4 py-2 hover:opacity-90 flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> Save Contact Info
            </button>
          </div>
        </section>

        <section className="bg-white border border-bone rounded-2xl p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-ink" />
            <h2 className="text-xl font-heading font-semibold text-ink">Operating Hours</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-bone text-stone text-sm">
                  <th className="pb-3 font-medium">Day</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Open Time</th>
                  <th className="pb-3 font-medium">Close Time</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {DAYS.map((day) => {
                  const dayData = hours[day] || { open: false, openTime: "09:00", closeTime: "22:00" };
                  return (
                    <tr key={day} className="border-b border-bone last:border-0">
                      <td className="py-3 font-medium text-ink">{day}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleHourChange(day, "open", !dayData.open)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${dayData.open ? "bg-ready" : "bg-stone/30"}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${dayData.open ? "translate-x-5" : "translate-x-1"}`} />
                        </button>
                        <span className="ml-2 text-xs font-medium text-stone">{dayData.open ? "Open" : "Closed"}</span>
                      </td>
                      <td className="py-3">
                        <input
                          type="time"
                          value={dayData.openTime}
                          onChange={(e) => handleHourChange(day, "openTime", e.target.value)}
                          disabled={!dayData.open}
                          className="bg-cream border border-bone rounded-lg px-2 py-1 text-ink outline-none disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="time"
                          value={dayData.closeTime}
                          onChange={(e) => handleHourChange(day, "closeTime", e.target.value)}
                          disabled={!dayData.open}
                          className="bg-cream border border-bone rounded-lg px-2 py-1 text-ink outline-none disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="mt-6 bg-ink text-cream font-medium rounded-xl px-6 py-2 hover:opacity-90 flex items-center justify-center gap-2">
            <Save className="h-4 w-4" /> Save Operating Hours
          </button>
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

        <section className="bg-white border border-bone rounded-2xl p-6 shadow-sm">
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
                onChange={(e) => setNewStaffRole(e.target.value as "kitchen" | "counter" | "cashier")}
                className="w-full bg-white border border-bone rounded-lg px-3 py-2 text-sm outline-none text-ink"
              >
                <option value="kitchen">Kitchen</option>
                <option value="counter">Counter</option>
                <option value="cashier">Cashier</option>
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
      <div className="flex items-start justify-between mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink capitalize">{staff.role}</span>
            <span className="text-xs text-stone">{staff.email}</span>
          </div>
          {staff.plain_password && (
            <span className="text-xs text-stone mt-0.5">
              Current Password: <span className="font-mono text-ink bg-cream border border-bone px-1 rounded">{staff.plain_password}</span>
            </span>
          )}
        </div>
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

function VerificationSection() {
  const [otp, setOtp] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const qc = useQueryClient();

  const verifyMut = useMutation({
    mutationFn: (data: { otp: string, google_maps_url?: string }) => 
      api("/api/admin/verify", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Verified successfully");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast.error(e.message || "Verification failed")
  });

  const resendMut = useMutation({
    mutationFn: () => api("/api/admin/resend-otp", { method: "POST" }),
    onSuccess: (res: any) => toast.success(res.message || "OTP resent to your email"),
    onError: (e: Error) => toast.error(e.message || "Failed to resend OTP")
  });

  return (
    <div className="bg-alert/10 border border-alert/20 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
      <div className="bg-alert/20 p-3 rounded-xl text-alert shrink-0">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-xl font-heading font-semibold text-alert">Action Required: Verify Restaurant</h2>
          <p className="text-stone text-sm mt-1">
            Your restaurant is currently in <b>Sandbox Mode</b>. Customers will see a warning banner, and orders will not be sent to the kitchen. 
            Enter the 6-digit Verification Code sent to your email to unlock live mode.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-ink block mb-1">Verification Code (OTP) *</span>
            <input 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
              placeholder="123456" 
              maxLength={6}
              className="w-full bg-white border border-bone rounded-xl px-3 py-2 text-ink outline-none" 
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink block mb-1">Google Maps Link (Optional)</span>
            <input 
              value={mapsUrl} 
              onChange={e => setMapsUrl(e.target.value)} 
              placeholder="https://maps.google.com/..." 
              className="w-full bg-white border border-bone rounded-xl px-3 py-2 text-ink outline-none" 
            />
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => verifyMut.mutate({ otp, google_maps_url: mapsUrl || undefined })}
            disabled={!otp || verifyMut.isPending}
            className="bg-alert text-white font-medium rounded-xl px-4 py-2 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {verifyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Now"}
          </button>
          
          <button 
            onClick={() => resendMut.mutate()}
            disabled={resendMut.isPending}
            className="text-stone font-medium text-sm hover:text-ink underline disabled:opacity-50 flex items-center gap-2"
          >
            {resendMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend OTP Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
