import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const HERO_VIDEO_URL =
  "https://res.cloudinary.com/dsgcb88b4/video/upload/v1777953690/Video_herro_scmd_wfpipk.mp4";
const HERO_FALLBACK_IMAGE = "/dashboard-mockup.png";

const proofMetrics = [
  { value: "200+", label: "doanh nghiệp" },
  { value: "10k+", label: "tuần tra/ngày" },
  { value: "70%", label: "giảm gian lận" },
];

export function HeroSection() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section
      className="relative isolate overflow-hidden bg-[#0A0E1A] text-[#E5E7EB]"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_22%_76%,rgba(16,185,129,0.10),transparent_30%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/8"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-8 py-8 sm:py-10 lg:min-h-[640px] lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-6 xl:min-h-[700px]">
          <div className="max-w-[640px]">
            <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#34D399]/20 bg-[#07111F]/80 px-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#B7C4D8] shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md">
              <span
                className="h-2 w-2 rounded-full bg-[#34D399] shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                aria-hidden="true"
              />
              Anti-fraud engine - bảo vệ 200+ DN
            </div>

            <h1
              id="hero-heading"
              className="mt-6 max-w-[600px] text-[clamp(2rem,4.8vw,4.2rem)] font-black leading-[0.98] tracking-normal text-white"
            >
              <span className="block whitespace-nowrap">Quản lý tuần tra</span>
              <span className="block whitespace-nowrap text-[#60A5FA]">
                theo thời gian thực
              </span>
            </h1>

            <p className="mt-5 max-w-[540px] text-[clamp(1rem,1.7vw,1.2rem)] font-semibold leading-8 text-[#B6C3D6]">
              SCMD Pro giúp đội bảo vệ xác thực QR/GPS, phát hiện gian lận và
              cảnh báo sự cố ngay khi rủi ro phát sinh.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_36px_rgba(37,99,235,0.32)] transition-all hover:bg-[#1D4ED8] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
              >
                Dùng thử miễn phí
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                to="/contact?intent=demo"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-extrabold text-[#E5E7EB] transition-all hover:bg-white/[0.09] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2563EB]">
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                </span>
                Xem demo
              </Link>
            </div>

            <div className="mt-5 flex max-w-[600px] flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[#91A0B8]">
              {[
                "Không cần thẻ tín dụng",
                "Onboarding trong 24 giờ",
                "Phù hợp bảo vệ thuê ngoài",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    className="h-4 w-4 text-[#34D399]"
                    aria-hidden="true"
                  />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 grid max-w-[610px] grid-cols-3 gap-3">
              {proofMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
                >
                  <div className="text-[clamp(1.6rem,3vw,2.25rem)] font-black leading-none text-white">
                    {metric.value}
                  </div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#91A0B8]">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#050A14] shadow-[0_26px_90px_rgba(0,0,0,0.48)]">
              {videoFailed ? (
                <img
                  className="aspect-[16/9] w-full object-cover"
                  src={HERO_FALLBACK_IMAGE}
                  alt="Giao diện SCMD Pro theo dõi tuần tra, sự cố và đối soát vận hành"
                  loading="eager"
                />
              ) : (
                <video
                  className="aspect-[16/9] w-full object-cover"
                  src={HERO_VIDEO_URL}
                  poster={HERO_FALLBACK_IMAGE}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onError={() => setVideoFailed(true)}
                  aria-label="Video minh họa SCMD Pro xác thực tuần tra bằng QR và GPS theo thời gian thực"
                />
              )}

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#050A14]/80 to-transparent"
                aria-hidden="true"
              />

              <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#07111F]/76 px-3 py-2 text-xs font-extrabold text-white backdrop-blur-md">
                <ShieldCheck
                  className="h-4 w-4 text-[#34D399]"
                  aria-hidden="true"
                />
                QR verified
              </div>

              <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                <div className="rounded-2xl border border-white/12 bg-[#07111F]/76 px-4 py-3 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#93C5FD]">
                    <Sparkles
                      className="h-3.5 w-3.5 text-[#34D399]"
                      aria-hidden="true"
                    />
                    Live patrol
                  </div>
                  <div className="mt-1 text-sm font-bold text-white">
                    Dữ liệu đồng bộ tức thì
                  </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-[#07111F]/76 px-4 py-3 text-right backdrop-blur-md">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#93C5FD]">
                    SLA
                  </div>
                  <div className="mt-1 text-2xl font-black text-white">
                    99.8%
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {["GPS Guard", "AI Watchdog", "Incident SLA"].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/8 bg-white/[0.045] px-3 py-3 text-center text-xs font-extrabold text-[#B6C3D6] backdrop-blur-md"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
