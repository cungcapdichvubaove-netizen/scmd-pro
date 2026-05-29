import { useState } from "react";
import { Link } from "react-router-dom";

type BillingCycle = "monthly" | "yearly";

const PLANS = [
  {
    id: "starter",
    name: "SCMD Starter",
    badge: null,
    tagline: "Bản Proof of Concept",
    description: "Trải nghiệm đầy đủ tính năng lõi, phù hợp để đánh giá và thuyết phục nội bộ trước khi triển khai toàn diện.",
    priceMonthly: 0,
    priceYearly: 0,
    cta: "Bắt đầu PoC miễn phí",
    ctaHref: "/register",
    highlight: false,
    features: [
      { label: "Tối đa 1 Quản lý và 2 Nhân viên", included: true },
      { label: "Tuần tra và check-in GPS", included: true },
      { label: "SOS và Alarm cơ bản", included: true },
      { label: "Báo cáo sự cố cơ bản", included: true },
      { label: "Chống giả lập vị trí", included: false },
      { label: "AI Watchdog phân tích rủi ro", included: false },
      { label: "Quản lý nhà thầu và SLA", included: false },
      { label: "Báo cáo PDF / Excel tự động", included: false },
    ],
  },
  {
    id: "pro",
    name: "SCMD Pro",
    badge: "Phổ biến nhất",
    tagline: "Bản tiêu chuẩn",
    description: "Tối ưu cho công ty an ninh chuyên nghiệp từ 10 đến 500 nhân viên.",
    priceMonthly: 99000,
    priceYearly: 79000,
    cta: "Bắt đầu 14 ngày miễn phí",
    ctaHref: "/register",
    highlight: true,
    features: [
      { label: "Nhân viên không giới hạn", included: true },
      { label: "Tuần tra và check-in GPS", included: true },
      { label: "SOS và Alarm nâng cao", included: true },
      { label: "Báo cáo sự cố nâng cao", included: true },
      { label: "Chống giả lập vị trí", included: true },
      { label: "AI Watchdog phân tích rủi ro", included: true },
      { label: "Quản lý nhà thầu và SLA", included: true },
      { label: "Báo cáo PDF / Excel tự động", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "SCMD Pro Max",
    badge: null,
    tagline: "Dành cho tập đoàn",
    description: "Hạ tầng không giới hạn, dedicated server, white-label cho tập đoàn lớn.",
    priceMonthly: null,
    priceYearly: null,
    cta: "Liên hệ kinh doanh",
    ctaHref: "/contact",
    highlight: false,
    features: [
      { label: "Dedicated Server và Data Isolation", included: true },
      { label: "SLA cam kết 99.99% uptime", included: true },
      { label: "White-label App", included: true },
      { label: "API Access / ERP Integration", included: true },
      { label: "Tùy chỉnh định dạng báo cáo", included: true },
      { label: "On-site technical support", included: true },
      { label: "SSO và phân quyền nâng cao", included: true },
      { label: "OpenTelemetry Observability", included: true },
    ],
  },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PricingSection() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-t border-white/5 bg-[#0B0F1A] py-16 lg:py-20"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3B82F6]">
            Bảng giá
          </div>
          <h2
            id="pricing-heading"
            className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl"
          >
            Minh bạch, linh hoạt, không ràng buộc
          </h2>
          <p className="mt-2.5 text-base text-[#64748B]">
            Bắt đầu miễn phí · Nâng cấp hoặc hủy bất cứ lúc nào
          </p>

          <div
            className="mt-6 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
            role="group"
            aria-label="Chu kỳ thanh toán"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
              className={`rounded-lg px-5 py-2 text-sm font-bold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                billing === "monthly"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Hàng tháng
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              aria-pressed={billing === "yearly"}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                billing === "yearly"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Hàng năm
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                Tiết kiệm 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-8 backdrop-blur-xl transition-all duration-200 ease-out ${
                  plan.highlight
                    ? "border-[#3B82F6]/40 bg-white/[0.05] shadow-2xl shadow-[#3B82F6]/10"
                    : "border-white/5 bg-white/[0.03] hover:border-white/10"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2" aria-label="Gói phổ biến nhất">
                    <span className="rounded-full bg-[#2563EB] px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#2563EB]/30">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                    {plan.tagline}
                  </div>
                  <h3 className="text-xl font-bold text-[#E5E7EB]">{plan.name}</h3>
                  <p className="mt-1.5 text-sm text-[#94A3B8]">{plan.description}</p>
                </div>

                <div className="mb-7">
                  {price !== null ? (
                    price === 0 ? (
                      <div>
                        <span
                          className="text-4xl font-bold text-[#E5E7EB]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          Miễn phí
                        </span>
                        <span className="ml-2 text-sm text-gray-400">cho PoC</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-end gap-1">
                          <span
                            className="text-3xl font-bold text-[#E5E7EB]"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {formatVND(price)}
                          </span>
                          <span className="mb-1 text-sm text-[#64748B]">/NV/tháng</span>
                        </div>
                        {billing === "yearly" && (
                          <p className="mt-1 text-xs text-[#64748B]">
                            Thanh toán{" "}
                            <span className="font-semibold text-[#94A3B8]">
                              {formatVND(price * 12)}
                            </span>{" "}
                            / nhân viên / năm
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <div>
                      <span
                        className="text-4xl font-bold text-[#E5E7EB]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Liên hệ
                      </span>
                      <p className="mt-1 text-sm text-[#64748B]">Báo giá theo nhu cầu</p>
                    </div>
                  )}
                </div>

                <Link
                  to={plan.ctaHref}
                  className={`mb-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
                    plan.highlight
                      ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25 hover:bg-[#1A4FD0]"
                      : "border border-white/10 bg-white/5 text-[#E5E7EB] hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <div className="mb-6 border-t border-white/5" />

                <ul className="space-y-3" aria-label={`Tính năng gói ${plan.name}`}>
                  {plan.features.map((feature) => (
                    <li
                      key={feature.label}
                      className={`flex items-center gap-3 text-sm transition-opacity ${
                        feature.included ? "opacity-100" : "opacity-40"
                      }`}
                    >
                      {feature.included ? (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/10" aria-hidden="true">
                          <svg className="h-3 w-3 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/5" aria-hidden="true">
                          <svg className="h-3 w-3 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      <span className="text-[#94A3B8]">{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-[#64748B]">
          <p>Tất cả gói bao gồm hỗ trợ kỹ thuật qua email · Thanh toán bằng VNĐ · Hủy bất cứ lúc nào</p>
          <p>
            Cần tư vấn gói phù hợp?{" "}
            <Link
              to="/contact"
              className="rounded font-semibold text-[#3B82F6] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-1"
            >
              Liên hệ đội ngũ kinh doanh →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
