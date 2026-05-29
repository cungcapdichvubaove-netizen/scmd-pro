import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  Sparkles,
  UserCheck,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../../../lib/api";
import { cn } from "../../../../lib/utils";
import { SCMDButton } from "../../../common/interfaces/components/SCMDButton";
import { SCMDCard } from "../../../common/interfaces/components/SCMDCard";
import {
  DashboardSpinner,
  dashboardPanelClass,
  dashboardSelectClass,
} from "../../../common/interfaces/components/DashboardUI";

const AUDIT_CHECKLIST_TEMPLATE = [
  {
    item: "Đồng phục & Tác phong",
    description: "Quần áo sạch sẽ, đúng quy định, bảng tên",
  },
  { item: "Công cụ & Vũ khí", description: "Bộ đàm, đèn pin, gậy, sổ nhật ký" },
  {
    item: "Vệ sinh mục tiêu",
    description: "Khu vực chốt trực sạch sẽ, gọn gàng",
  },
  {
    item: "Kiến thức nghiệp vụ",
    description: "Nắm vững quy trình xử lý sự cố tại chỗ",
  },
  {
    item: "Trạng thái tỉnh táo",
    description: "Không ngủ gật, không sử dụng điện thoại cá nhân",
  },
];

export const SurpriseAudit: React.FC = () => {
  const [step, setStep] = useState<"history" | "form">("history");
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Form State
  const [auditForm, setAuditForm] = useState({
    siteId: "",
    checklist: AUDIT_CHECKLIST_TEMPLATE.map((t) => ({
      item: t.item,
      status: "PASS" as "PASS" | "FAIL",
      note: "",
    })),
    contractorRepresentative: "",
    evidenceUris: [] as string[],
  });

  useEffect(() => {
    fetchAudits();
    fetchSites();
    getCurrentGPS();
  }, []);

  const getCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        (err) => console.warn("GPS Error:", err.message),
      );
    }
  };

  const fetchSites = async () => {
    try {
      const result = await apiFetch<any[]>("/api/tenant/checkpoints");
      const validatedSites = Array.isArray(result)
        ? result
        : (result as any)?.data || [];
      setSites(validatedSites);
      if (validatedSites.length > 0) {
        setAuditForm((prev) => ({ ...prev, siteId: validatedSites[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<any[]>("/api/tenant/audits");
      setAudits(Array.isArray(result) ? result : (result as any)?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuditSubmit = async () => {
    setSubmitting(true);
    try {
      const passCount = Array.isArray(auditForm.checklist)
        ? auditForm.checklist.filter((c) => c.status === "PASS").length
        : 0;
      const overallScore =
        Array.isArray(auditForm.checklist) && auditForm.checklist.length > 0
          ? (passCount / auditForm.checklist.length) * 100
          : 0;

      await apiFetch("/api/tenant/audits", {
        method: "POST",
        body: JSON.stringify({
          ...auditForm,
          overallScore,
          locationLat: currentLocation?.lat || 10.762622,
          locationLng: currentLocation?.lng || 106.660172,
        }),
      });

      // Reset form về mặc định sau submit thành công
      setAuditForm({
        siteId: Array.isArray(sites) && sites.length > 0 ? sites[0].id : "",
        checklist: AUDIT_CHECKLIST_TEMPLATE.map((t) => ({
          item: t.item,
          status: "PASS" as "PASS" | "FAIL",
          note: "",
        })),
        contractorRepresentative: "",
        evidenceUris: [],
      });

      setStep("history");
      fetchAudits();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  if (step === "history") {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        <motion.div
          variants={itemVariants}
          className={cn(
            dashboardPanelClass,
            "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
          )}
        >
          <div className="min-w-0">
            <h3 className="text-lg font-black tracking-[-0.02em] text-white">
              Nhật ký kiểm tra
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <Sparkles size={10} className="text-scmd-cyber" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-scmd-silver/45">
                SLA nhà thầu bảo vệ · {audits.length} phiên
              </p>
            </div>
          </div>
          <SCMDButton
            onClick={() => setStep("form")}
            className="h-12 w-full bg-scmd-cyber font-black text-slate-950 shadow-lg shadow-scmd-cyber/20 transition-all hover:brightness-110 sm:w-auto"
          >
            KHỞI TẠO PHIÊN AUDIT
          </SCMDButton>
        </motion.div>

        {loading ? (
          <DashboardSpinner message="Đang tải lịch sử audit..." />
        ) : (
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {Array.isArray(audits) &&
              audits.map((audit) => (
                <SCMDCard
                  key={audit.id}
                  className="relative overflow-hidden border-white/5 bg-scmd-navy/50 p-5 transition-all hover:border-scmd-cyber/30"
                >
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest block mb-1">
                        Thời gian
                      </span>
                      <p className="text-sm font-bold text-white font-mono">
                        {new Date(audit.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest block mb-1">
                        Điểm SLA
                      </span>
                      <p
                        className={cn(
                          "text-xl font-black",
                          audit.overallScore >= 80
                            ? "text-emerald-400"
                            : "text-amber-400",
                        )}
                      >
                        {audit.overallScore}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-scmd-navy rounded-2xl mb-4 border border-white/5 relative z-10 transition-colors group-hover:border-scmd-cyber/20">
                    <MapPin size={14} className="text-scmd-cyber" />
                    <p className="text-[10px] font-black text-scmd-silver/60 uppercase tracking-widest truncate">
                      Site: {audit.siteId}
                    </p>
                  </div>

                  <div className="space-y-1 relative z-10">
                    {Array.isArray(audit.checklist) &&
                      audit.checklist.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[10px]"
                        >
                          {c.status === "PASS" ? (
                            <CheckCircle2
                              size={10}
                              className="text-emerald-400"
                            />
                          ) : (
                            <AlertCircle size={10} className="text-red-400" />
                          )}
                          <span className="text-scmd-silver/40 font-bold uppercase">
                            {c.item}
                          </span>
                        </div>
                      ))}
                  </div>
                </SCMDCard>
              ))}
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-3xl space-y-6 pb-20"
    >
      <div
        className={cn(
          dashboardPanelClass,
          "flex items-center gap-4 p-4 sm:p-5",
        )}
      >
        <button
          onClick={() => setStep("history")}
          className="p-3 bg-scmd-navy/50 text-scmd-silver/40 hover:text-white rounded-2xl border border-white/5 hover:border-scmd-primary/30 transition-all"
        >
          <Trash2 size={24} className="rotate-45" />
        </button>
        <h2 className="text-xl font-black tracking-[-0.02em] text-white">
          Báo cáo Kiểm tra số
        </h2>
      </div>

      <SCMDCard className="rounded-[28px] border-white/10 bg-scmd-navy/80 p-5 shadow-huge backdrop-blur-xl sm:p-6">
        <div className="space-y-10">
          {/* Site Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-scmd-cyber uppercase tracking-[0.2em] block ml-2">
              Chọn mục tiêu kiểm tra (Site)
            </label>
            <div className="relative">
              <select
                className={dashboardSelectClass}
                value={auditForm.siteId}
                onChange={(e) =>
                  setAuditForm({ ...auditForm, siteId: e.target.value })
                }
              >
                <option value="" className="bg-scmd-navy">
                  -- Chọn site --
                </option>
                {Array.isArray(sites) &&
                  sites.map((s) => (
                    <option
                      key={s.id}
                      value={s.id || s.fullName}
                      className="bg-scmd-navy"
                    >
                      {s.fullName}
                    </option>
                  ))}
                <option value="EXTERNAL" className="bg-scmd-navy">
                  Mục tiêu ngoài danh mục
                </option>
              </select>
              <MapPin
                className="absolute right-6 top-1/2 -translate-y-1/2 text-scmd-cyber/40 pointer-events-none"
                size={20}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-6">
            <p className="text-[10px] font-black text-scmd-cyber uppercase tracking-[0.2em] mb-6 border-b border-scmd-cyber/10 pb-4">
              Hạng mục kiểm tra hiện trường
            </p>
            {auditForm.checklist.map((check, idx) => (
              <div
                key={idx}
                className="p-6 bg-scmd-navy/40 rounded-[32px] border border-white/5 space-y-4 hover:border-white/10 transition-all"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-base font-black text-white uppercase tracking-tight">
                      {check.item}
                    </p>
                    <p className="text-[10px] text-scmd-silver/30 font-bold uppercase mt-1 tracking-widest">
                      {AUDIT_CHECKLIST_TEMPLATE[idx]?.description}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        const newCheck = [...auditForm.checklist];
                        if (newCheck[idx]) {
                          newCheck[idx].status = "PASS";
                          setAuditForm({ ...auditForm, checklist: newCheck });
                        }
                      }}
                      className={cn(
                        "flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        check.status === "PASS"
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                          : "bg-scmd-navy text-scmd-silver/30 border border-white/5",
                      )}
                    >
                      ĐẠT
                    </button>
                    <button
                      onClick={() => {
                        const newCheck = [...auditForm.checklist];
                        if (newCheck[idx]) {
                          newCheck[idx].status = "FAIL";
                          setAuditForm({ ...auditForm, checklist: newCheck });
                        }
                      }}
                      className={cn(
                        "flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        check.status === "FAIL"
                          ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                          : "bg-scmd-navy text-scmd-silver/30 border border-white/5",
                      )}
                    >
                      KÉM
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Ghi chú thêm (nếu có)..."
                  className="w-full bg-scmd-navy/80 border border-white/5 rounded-xl p-4 text-xs text-white outline-none focus:border-scmd-cyber/50 transition-all placeholder:text-scmd-silver/10"
                  value={check.note}
                  onChange={(e) => {
                    const newCheck = [...auditForm.checklist];
                    if (newCheck[idx]) {
                      newCheck[idx].note = e.target.value;
                      setAuditForm({ ...auditForm, checklist: newCheck });
                    }
                  }}
                />
              </div>
            ))}
          </div>

          {/* Evidence */}
          <div className="space-y-6">
            <p className="text-[10px] font-black text-scmd-cyber uppercase tracking-[0.2em] mb-6 border-b border-scmd-cyber/10 pb-4">
              Bằng chứng hình ảnh trực quan
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {auditForm.evidenceUris.map((uri, idx) => (
                <div
                  key={idx}
                  className="aspect-square relative rounded-[32px] overflow-hidden group border border-white/10"
                >
                  <img
                    src={uri}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.onerror = null;
                    }}
                  />
                  <button
                    onClick={() => {
                      const newUris = [...auditForm.evidenceUris];
                      newUris.splice(idx, 1);
                      setAuditForm({ ...auditForm, evidenceUris: newUris });
                    }}
                    className="absolute inset-0 bg-red-600/90 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300"
                  >
                    <Trash2
                      size={32}
                      className="text-white scale-75 group-hover:scale-100 transition-transform"
                    />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const uri = window.prompt("Nhập URL ảnh bằng chứng thực tế");
                  if (!uri?.trim()) return;
                  setAuditForm({
                    ...auditForm,
                    evidenceUris: [...auditForm.evidenceUris, uri.trim()],
                  });
                }}
                className="aspect-square bg-scmd-navy/50 rounded-[32px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-scmd-silver/20 hover:text-scmd-cyber hover:border-scmd-cyber hover:bg-scmd-cyber/5 transition-all group"
              >
                <div className="p-4 bg-scmd-navy rounded-full mb-3 group-hover:scale-110 transition-transform border border-white/5">
                  <Camera size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest mt-2">
                  THÊM ẢNH
                </span>
              </button>
            </div>
          </div>

          {/* Representative */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-[0.2em] block ml-2">
              Đại diện nhà thầu tại mục tiêu
            </label>
            <div className="relative">
              <UserCheck
                className="absolute left-6 top-1/2 -translate-y-1/2 text-scmd-silver/20 transition-colors group-focus-within:text-scmd-cyber"
                size={20}
              />
              <input
                type="text"
                placeholder="Họ tên người nhận biên bản..."
                className="w-full bg-scmd-navy border border-white/10 rounded-[28px] p-6 pl-16 text-sm text-white outline-none focus:ring-4 focus:ring-scmd-cyber/10 transition-all font-bold placeholder:text-scmd-silver/10"
                value={auditForm.contractorRepresentative}
                onChange={(e) =>
                  setAuditForm({
                    ...auditForm,
                    contractorRepresentative: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <SCMDButton
            onClick={handleAuditSubmit}
            disabled={submitting}
            className="w-full h-20 bg-scmd-cyber text-slate-950 font-black rounded-[32px] shadow-huge mt-10 text-xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-scmd-cyber/20"
          >
            {submitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send size={24} />
            )}
            KÝ & BAN HÀNH BIÊN BẢN SỐ
          </SCMDButton>
        </div>
      </SCMDCard>

      <div className="flex items-center gap-6 p-8 bg-amber-500/5 border border-amber-500/10 rounded-[40px] backdrop-blur-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
        <ShieldAlert
          className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform"
          size={32}
        />
        <p className="text-[11px] font-bold text-amber-200/60 leading-relaxed uppercase tracking-wider">
          LƯU Ý: BIÊN BẢN SẼ ĐƯỢC ĐÍNH KÈM GPS VÀ TIMESTAMP KHÔNG THỂ THAY ĐỔI.
          ĐÂY LÀ BẰNG CHỨNG PHÁP LÝ CHO VIỆC KHẤU TRỪ CHI PHÍ DỊCH VỤ THÁNG.
        </p>
      </div>
    </motion.div>
  );
};
