import { useEffect, useRef, useState } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { SEOHead } from "@/components/seo/SEOHead";
import { LandingHeader } from "@/components/landing/LandingHeader";

type SubmitStatus = "idle" | "loading" | "success" | "error";


declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
      }) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_TURNSTILE_SITE_KEY) || "";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

interface FormState {
  fullName: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
  website: string;
}

type FormErrors = Partial<Record<keyof FormState | "turnstile", string>>;

const SUPPORT_CHANNELS = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    label: "Email hỗ trợ",
    value: "support@scmdpro.com",
    href: "mailto:support@scmdpro.com",
    badge: "24/7",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    label: "Hotline doanh nghiệp",
    value: "1900 2345",
    href: "tel:19002345",
    badge: "Giờ hành chính",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    label: "Trò chuyện trực tiếp",
    value: "Trao đổi trực tiếp với kỹ thuật viên",
    href: "#",
    badge: "Đang hoạt động",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
];

const SUBJECT_OPTIONS = [
  "Yêu cầu demo / tư vấn gói",
  "Hỗ trợ kỹ thuật",
  "Báo lỗi / sự cố hệ thống",
  "Hợp tác kinh doanh",
  "Vấn đề thanh toán",
  "Khác",
];

const INITIAL_FORM: FormState = {
  fullName: "",
  email: "",
  company: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
};

function SupportChannelCard({
  icon,
  label,
  value,
  href,
  badge,
  badgeColor,
}: (typeof SUPPORT_CHANNELS)[number]) {
  return (
    <a
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all duration-200 hover:border-blue-500/20 hover:bg-blue-500/[0.03]"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition-colors group-hover:bg-blue-500/20">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
            {badge}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">{value}</p>
      </div>
      <svg
        className="h-4 w-4 flex-shrink-0 translate-x-0 text-slate-600 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}

function FormField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-300">
        {label}
        {required && <span className="ml-1 text-blue-400">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-blue-500/50 focus:bg-blue-500/[0.03] focus:outline-none focus:ring-1 focus:ring-blue-500/30";

export function ContactPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileReady, setTurnstileReady] = useState(!TURNSTILE_SITE_KEY);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      setTurnstileReady(true);
      return undefined;
    }

    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !turnstileContainerRef.current || !window.turnstile || turnstileWidgetIdRef.current) return;

      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: (token) => {
          setTurnstileToken(token);
          setTurnstileReady(true);
          setFieldErrors((prev) => ({ ...prev, turnstile: undefined }));
        },
        "expired-callback": () => {
          setTurnstileToken("");
          setTurnstileReady(true);
        },
        "error-callback": () => {
          setTurnstileToken("");
          setTurnstileReady(true);
          setFieldErrors((prev) => ({
            ...prev,
            turnstile: "Không thể tải bước xác minh bảo mật. Vui lòng tải lại trang hoặc liên hệ support@scmdpro.com.",
          }));
        },
      });
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (window.turnstile) {
      renderWidget();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderWidget, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      script.onerror = () => {
        setTurnstileReady(true);
        setFieldErrors((prev) => ({
          ...prev,
          turnstile: "Không thể tải bước xác minh bảo mật. Vui lòng thử lại sau.",
        }));
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  function resetTurnstile() {
    setTurnstileToken("");
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validateForm(): FormErrors {
    const errors: FormErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[0-9][0-9\s().-]{7,24}$/;

    if (form.fullName.trim().length < 2) errors.fullName = "Vui lòng nhập họ tên tối thiểu 2 ký tự.";
    if (!emailPattern.test(form.email.trim())) errors.email = "Email không hợp lệ.";
    if (form.phone.trim() && !phonePattern.test(form.phone.trim())) errors.phone = "Số điện thoại không hợp lệ.";
    if (!form.subject.trim()) errors.subject = "Vui lòng chọn chủ đề yêu cầu.";
    if (form.message.trim().length < 10) errors.message = "Vui lòng nhập nội dung tối thiểu 10 ký tự.";
    if (TURNSTILE_SITE_KEY && !turnstileToken) errors.turnstile = "Vui lòng hoàn tất bước xác minh bảo mật.";

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const errors = validateForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStatus("error");
      setErrorMessage("Vui lòng kiểm tra lại các trường được đánh dấu.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setTrackingCode(null);

    try {
      const response = await fetch("/api/v1/public/contact-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          phone: form.phone.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          website: form.website,
          source: "PUBLIC_CONTACT_PAGE",
          turnstileToken: turnstileToken || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error?.message || payload?.message || "Có lỗi xảy ra khi gửi yêu cầu."
        );
      }

      setTrackingCode(payload.trackingCode || null);
      setStatus("success");
      resetTurnstile();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Có lỗi xảy ra khi gửi yêu cầu.");
      setStatus("error");
      resetTurnstile();
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setTrackingCode(null);
    setErrorMessage(null);
    setFieldErrors({});
    setStatus("idle");
    resetTurnstile();
  }

  return (
    <>
      <SEOHead
        title="Liên hệ & Hỗ trợ - SCMD Pro"
        description="Liên hệ đội ngũ SCMD Pro để được tư vấn giải pháp bảo mật doanh nghiệp, hỗ trợ kỹ thuật 24/7 hoặc yêu cầu demo miễn phí."
        url="https://scmdpro.com/contact"
        type="website"
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Liên hệ SCMD Pro",
          url: "https://scmdpro.com/contact",
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+84-1900-2345",
            contactType: "customer support",
            email: "support@scmdpro.com",
            availableLanguage: "Vietnamese",
            hoursAvailable: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            },
          },
        }}
      />

      <div className="min-h-screen bg-slate-950 text-white antialiased">
        <LandingHeader />

        <main id="main-content">
          <section
            className="relative overflow-hidden border-b border-white/5 py-8 md:py-10"
            aria-labelledby="contact-heading"
          >
            <div
              className="absolute left-1/2 top-0 -z-10 h-[400px] w-[800px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.07),transparent_60%)]"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
              aria-hidden="true"
            />

            <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[minmax(0,1.05fr)_360px] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5">
                  <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-400">Hỗ trợ kỹ thuật 24/7</span>
                </div>

                <h1
                  id="contact-heading"
                  className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl md:text-[2.75rem]"
                >
                  Liên hệ &{" "}
                  <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                    Hỗ trợ
                  </span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  Gửi yêu cầu hỗ trợ, yêu cầu demo hoặc liên hệ tư vấn. Đội ngũ SCMD Pro phản hồi trong vòng{" "}
                  <span className="font-semibold text-slate-200">2 giờ làm việc</span>.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.05] p-5 backdrop-blur-sm">
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-blue-300">Cam kết phản hồi</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Sự cố kỹ thuật</span>
                    <span className="font-bold text-white">&lt; 2h làm việc</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Yêu cầu demo / tư vấn</span>
                    <span className="font-bold text-white">Trong ngày</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Kênh hỗ trợ</span>
                    <span className="font-bold text-emerald-400">Email / Hotline / Chat</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-8 md:py-10">
            <div className="grid gap-12 lg:grid-cols-[1fr_420px] xl:gap-16">
              <div>
                <h2 className="mb-2 text-xl font-black text-white">Gửi yêu cầu</h2>
                <p className="mb-8 text-sm text-slate-500">
                  Điền thông tin bên dưới, chúng tôi sẽ phản hồi sớm nhất có thể.
                </p>

                {status === "success" ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 py-16 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                      <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-black text-white">Đã nhận yêu cầu</h3>
                    <p className="mb-3 max-w-xs text-sm text-slate-400">
                      Chúng tôi sẽ liên hệ lại theo email <span className="font-semibold text-slate-200">{form.email}</span> trong vòng 2 giờ làm việc.
                    </p>
                    {trackingCode && (
                      <p className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold tracking-wide text-emerald-300">
                        Mã tiếp nhận: {trackingCode}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                      Gửi yêu cầu khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} aria-label="Form liên hệ SCMD Pro">
                    <div className="space-y-5">
                      <div className="hidden" aria-hidden="true">
                        <label htmlFor="contact-website">Website</label>
                        <input
                          id="contact-website"
                          type="text"
                          name="website"
                          value={form.website}
                          onChange={handleChange}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField id="contact-fullName" label="Họ và tên" required error={fieldErrors.fullName}>
                          <input
                            id="contact-fullName"
                            aria-invalid={Boolean(fieldErrors.fullName)}
                            aria-describedby={fieldErrors.fullName ? "contact-fullName-error" : undefined}
                            type="text"
                            name="fullName"
                            value={form.fullName}
                            onChange={handleChange}
                            required
                            autoComplete="name"
                            placeholder="Nguyễn Văn A"
                            className={inputClass}
                          />
                        </FormField>
                        <FormField id="contact-email" label="Email doanh nghiệp" required error={fieldErrors.email}>
                          <input
                            id="contact-email"
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                            placeholder="ban@doanhnghiep.vn"
                            className={inputClass}
                          />
                        </FormField>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField id="contact-company" label="Tên công ty" error={fieldErrors.company}>
                          <input
                            id="contact-company"
                            aria-invalid={Boolean(fieldErrors.company)}
                            aria-describedby={fieldErrors.company ? "contact-company-error" : undefined}
                            type="text"
                            name="company"
                            value={form.company}
                            onChange={handleChange}
                            autoComplete="organization"
                            placeholder="Công ty SCMD"
                            className={inputClass}
                          />
                        </FormField>
                        <FormField id="contact-phone" label="Số điện thoại" error={fieldErrors.phone}>
                          <input
                            id="contact-phone"
                            aria-invalid={Boolean(fieldErrors.phone)}
                            aria-describedby={fieldErrors.phone ? "contact-phone-error" : undefined}
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            autoComplete="tel"
                            placeholder="0912 345 678"
                            className={inputClass}
                          />
                        </FormField>
                      </div>

                      <FormField id="contact-subject" label="Chủ đề yêu cầu" required error={fieldErrors.subject}>
                        <select
                          id="contact-subject"
                          aria-invalid={Boolean(fieldErrors.subject)}
                          aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
                          name="subject"
                          value={form.subject}
                          onChange={handleChange}
                          required
                          className={`${inputClass} appearance-none cursor-pointer`}
                        >
                          <option value="" disabled>
                            Chọn chủ đề...
                          </option>
                          {SUBJECT_OPTIONS.map((subject) => (
                            <option key={subject} value={subject} className="bg-slate-900">
                              {subject}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField id="contact-message" label="Nội dung" required error={fieldErrors.message}>
                        <textarea
                          id="contact-message"
                          aria-invalid={Boolean(fieldErrors.message)}
                          aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          placeholder="Mô tả chi tiết yêu cầu hoặc sự cố của bạn..."
                          className={`${inputClass} resize-none`}
                        />
                      </FormField>
                    </div>

                    {TURNSTILE_SITE_KEY && (
                      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div ref={turnstileContainerRef} aria-label="Xác minh bảo mật Cloudflare Turnstile" />
                        {fieldErrors.turnstile && (
                          <p id="contact-turnstile-error" role="alert" className="mt-2 text-xs font-medium text-red-400">
                            {fieldErrors.turnstile}
                          </p>
                        )}
                      </div>
                    )}

                    {status === "error" && (
                      <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                        {errorMessage || "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại hoặc liên hệ trực tiếp qua email."}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading" || !turnstileReady}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-500/10 transition-all duration-200 hover:opacity-95 hover:shadow-blue-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {status === "loading" ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          Gửi yêu cầu
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>

                    <p className="mt-4 text-center text-xs text-slate-600">
                      Bằng cách gửi form, bạn đồng ý với{" "}
                      <a href="/privacy" className="text-slate-400 underline underline-offset-2 transition-colors hover:text-white">
                        Chính sách bảo mật
                      </a>{" "}
                      của chúng tôi.
                    </p>
                  </form>
                )}
              </div>

              <aside aria-label="Kênh liên hệ trực tiếp">
                <div className="mb-8">
                  <h2 className="mb-2 text-xl font-black text-white">Kênh liên hệ</h2>
                  <p className="mb-6 text-sm text-slate-500">
                    Liên hệ trực tiếp qua kênh phù hợp với mức độ ưu tiên của bạn.
                  </p>
                  <div className="space-y-3">
                    {SUPPORT_CHANNELS.map((channel) => (
                      <SupportChannelCard key={channel.label} {...channel} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.06] to-indigo-500/[0.04] p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
                      <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="font-black text-white">Cam kết SLA</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    {[
                      { tier: "P0 - Sự cố nghiêm trọng", sla: "< 1 giờ", color: "text-red-400" },
                      { tier: "P1 - Lỗi ảnh hưởng vận hành", sla: "< 4 giờ", color: "text-amber-400" },
                      { tier: "P2 - Câu hỏi kỹ thuật", sla: "< 1 ngày", color: "text-blue-400" },
                      { tier: "P3 - Tư vấn / Demo", sla: "< 2 ngày", color: "text-slate-400" },
                    ].map(({ tier, sla, color }) => (
                      <li key={tier} className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">{tier}</span>
                        <span className={`flex-shrink-0 font-bold ${color}`}>{sla}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="/help"
                  className="group mt-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">Trung tâm hướng dẫn</p>
                      <p className="text-xs text-slate-500">Tài liệu và hướng dẫn chi tiết</p>
                    </div>
                  </div>
                  <svg className="h-4 w-4 translate-x-0 text-slate-600 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </aside>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/5 bg-slate-950 py-8 text-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} SCMD Pro. Bảo lưu mọi quyền.</p>
        </footer>
      </div>
    </>
  );
}
