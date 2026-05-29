import { lazy, Suspense, useRef, useEffect, memo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";

import { SEOHead } from "./SEOHead";
import { JsonLd } from "@/components/seo/JsonLd";
import { useIntersectionObserver } from "./useIntersectionObserver";
import { FOOTER_LINKS } from "./footer-links";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { StatsSection } from "./StatsSection";
import { SCMDLogo } from "@/apps/common/interfaces/components/SCMDLogo";
import ClientLogos from "./ClientLogos";
const FeaturesAndTrustSectionSkeleton = () => (
  <>
    <div className="bg-[#0B0F1A] py-16 lg:py-20" aria-busy="true" aria-label="Đang tải tính năng">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-4 h-6 w-48 animate-pulse rounded-full bg-white/5" />
          <div className="h-10 w-96 animate-pulse rounded-lg bg-white/5" />
          <div className="mt-4 h-6 w-80 animate-pulse rounded-md bg-white/5" />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 w-full animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>

    <div className="bg-[#0B0F1A] py-14 lg:py-16" aria-busy="true" aria-label="Đang tải công nghệ nền tảng">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-12 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/5" />
          <div className="h-8 w-64 animate-pulse rounded-full bg-white/5" />
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="mb-8 mt-14 text-center">
          <div className="mx-auto h-8 w-80 animate-pulse rounded-lg bg-white/5" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 w-full animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  </>
);

const PricingAndFAQSectionSkeleton = () => (
  <>
    <div className="bg-[#0B0F1A] py-16 lg:py-20" aria-busy="true" aria-label="Đang tải bảng giá">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 h-6 w-32 animate-pulse rounded-full bg-white/5" />
          <div className="h-10 w-96 animate-pulse rounded-lg bg-white/5" />
          <div className="mt-3 h-6 w-64 animate-pulse rounded-md bg-white/5" />
          <div className="mt-8 h-12 w-64 animate-pulse rounded-xl bg-white/5" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[600px] w-full animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>

    <div className="bg-[#0B0F1A] py-16 lg:py-20" aria-busy="true" aria-label="Đang tải FAQ">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-10 text-center">
          <div className="mb-4 h-6 w-48 animate-pulse rounded-full bg-white/5" />
          <div className="h-10 w-80 animate-pulse rounded-lg bg-white/5" />
          <div className="mt-3 h-6 w-64 animate-pulse rounded-md bg-white/5" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  </>
);

const LazyFeaturesAndTrustSection = memo(lazy(() =>
  import("./FeaturesAndTrustSection").then((m) => ({ default: m.FeaturesAndTrustSection }))
));
const LazyPricingAndFAQSection = memo(lazy(() =>
  import("./PricingAndFAQSection").then((m) => ({ default: m.PricingAndFAQSection }))
));

const SOCIAL_LINKS = [
  { label: "Facebook", abbr: "f", href: "https://facebook.com/scmdpro" },
  { label: "LinkedIn", abbr: "in", href: "https://linkedin.com/company/scmdpro" },
  { label: "YouTube", abbr: "yt", href: "#" },
  { label: "Twitter", abbr: "tw", href: "#" },
];

const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t + b;
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
};

export function LandingPage() {
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [setFeaturesNode, featuresEntry] = useIntersectionObserver({
    rootMargin: "200px",
    freezeOnceVisible: true,
  });
  const [setPricingNode, pricingEntry] = useIntersectionObserver({
    rootMargin: "200px",
    freezeOnceVisible: true,
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollBehavior = "smooth";

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.hash && link.pathname === window.location.pathname) {
        const targetId = link.hash.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement && !("scrollBehavior" in root.style)) {
          e.preventDefault();
          const headerOffset = 80;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;

          const startPosition = window.scrollY;
          const distance = offsetPosition - startPosition;
          const duration = 600;
          let start: number | null = null;

          const animation = (currentTime: number) => {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
          };

          requestAnimationFrame(animation);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    if (featuresRef.current) setFeaturesNode(featuresRef.current);
    if (pricingRef.current) setPricingNode(pricingRef.current);

    return () => {
      root.style.scrollBehavior = "auto";
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [setFeaturesNode, setPricingNode]);

  const scrollToTop = () => {
    const root = document.documentElement;
    if ("scrollBehavior" in root.style) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const startPosition = window.scrollY;
    const duration = 600;
    let start: number | null = null;

    const animation = (currentTime: number) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const run = easeInOutQuad(timeElapsed, startPosition, -startPosition, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    };

    requestAnimationFrame(animation);
  };

  return (
    <>
      <SEOHead
        title="SCMD Pro - Hệ thống Quản trị và Chỉ huy An ninh Doanh nghiệp"
        description="Giải pháp B2B SaaS giúp quản lý đội ngũ bảo vệ, tuần tra thông minh, chống gian lận vị trí GPS và báo cáo sự cố tự động bằng AI."
        url="https://scmdpro.com"
        type="website"
        keywords="quản lý bảo vệ, tuần tra thông minh, an ninh doanh nghiệp, phần mềm an ninh, chống gian lận gps, scmd pro"
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "SCMD Pro",
          url: "https://scmdpro.com",
          logo: "https://scmdpro.com/logo_scmd_pro.png",
          sameAs: [
            "https://facebook.com/scmdpro",
            "https://linkedin.com/company/scmdpro",
          ],
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "SCMD Pro",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Android, iOS",
          url: "https://scmdpro.com",
          description: "Enterprise Security Management System với AI Watchdog, GPS Anti-Fraud và Real-time SOC.",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "VND",
            lowPrice: "0",
            highPrice: "99000",
            offerCount: "3",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "128",
          },
        }}
      />

      <div className="min-h-screen bg-[#0A0E1A] font-sans text-[#E5E7EB] antialiased">
        <motion.div
          className="fixed left-0 right-0 top-0 z-[100] h-0.5 origin-left bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#3B82F6]"
          style={{ scaleX }}
        />

        <LandingHeader />

        <main id="main-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <HeroSection />
          </motion.div>

          <ClientLogos />
          <StatsSection />

          <motion.div
            ref={featuresRef}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {featuresEntry?.isIntersecting ? (
              <Suspense fallback={<FeaturesAndTrustSectionSkeleton />}>
                <LazyFeaturesAndTrustSection />
              </Suspense>
            ) : (
              <FeaturesAndTrustSectionSkeleton />
            )}
          </motion.div>

          <motion.div
            ref={pricingRef}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {pricingEntry?.isIntersecting ? (
              <Suspense fallback={<PricingAndFAQSectionSkeleton />}>
                <LazyPricingAndFAQSection />
              </Suspense>
            ) : (
              <PricingAndFAQSectionSkeleton />
            )}
          </motion.div>
        </main>

        <footer className="border-t border-white/5 bg-[#05080F] pb-7 pt-14">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-lg text-lg font-bold tracking-tight text-[#E5E7EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2"
                  aria-label="SCMD Pro - Trang chủ"
                >
                  <SCMDLogo size="md" className="shrink-0" />
                </Link>

                <p className="mt-3 text-xs leading-relaxed text-[#475569]">
                  Giải pháp quản lý an ninh toàn diện cho doanh nghiệp hiện đại.
                </p>

                <div className="mt-4 flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
                  <span className="text-[11px] font-bold text-[#22C55E]">Hệ thống đang hoạt động</span>
                </div>

                <div className="mt-5">
                  <span
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-[#3B82F6]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    v5.1.1 - Enterprise
                  </span>
                </div>

                <div className="mt-5 flex gap-2">
                  {SOCIAL_LINKS.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      aria-label={item.label}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-[10px] font-bold text-[#64748B] transition-colors duration-150 hover:border-white/15 hover:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                    >
                      {item.abbr}
                    </a>
                  ))}
                </div>
              </div>

              {FOOTER_LINKS.map((column) => (
                <div key={column.heading}>
                  <Link
                    to={column.headingTo}
                    className="mb-4 inline-flex rounded text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                  >
                    {column.heading}
                  </Link>
                  <ul className="space-y-2.5">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="rounded text-sm text-[#475569] transition-colors duration-150 hover:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 sm:flex-row">
              <p className="text-[11px] text-[#334155]">
                &copy; {new Date().getFullYear()} SCMD Pro. Tất cả quyền được bảo lưu. ·{" "}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>v5.1.1</span>
              </p>
              <div className="flex items-center gap-4">
                <Link to="/articles/chinh-sach-bao-mat" className="text-[11px] text-[#334155] transition-colors hover:text-[#475569]">
                  Chính sách bảo mật
                </Link>
                <Link to="/articles/dieu-khoan-dich-vu" className="text-[11px] text-[#334155] transition-colors hover:text-[#475569]">
                  Điều khoản dịch vụ
                </Link>
                <span className="text-[11px] text-[#334155]">Made with love in Vietnam</span>
              </div>
            </div>
          </div>
        </footer>

        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToTop}
              className="fixed bottom-24 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0B0F1A]/80 text-[#94A3B8] shadow-2xl backdrop-blur-md transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
              aria-label="Cuộn lên đầu trang"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        <a
          href="/contact"
          aria-label="Liên hệ hỗ trợ"
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          style={{
            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            boxShadow: "0 4px 20px rgba(37,99,235,0.5)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5" aria-hidden="true">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </a>
      </div>
    </>
  );
}
