import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogIn, Menu, X } from "lucide-react";

import { SCMDLogo } from "@/apps/common/interfaces/components/SCMDLogo";

const NAV_ITEMS = [
  {
    label: "Tính năng",
    href: "#features",
    children: [
      { label: "Tuần tra thông minh", href: "#features", desc: "GPS Anti-fraud, QR luân chuyển" },
      { label: "AI Watchdog", href: "#features", desc: "Gemini Flash phân tích rủi ro" },
      { label: "Quản lý sự cố", href: "#features", desc: "Vòng đời end-to-end" },
      { label: "Đánh giá nhà thầu", href: "#features", desc: "SLA scoring tự động" },
    ],
  },
  { label: "Bảng giá", href: "#pricing" },
  { label: "Hỗ trợ", href: "/help" },
  { label: "Tin tức", href: "/news" },
  { label: "Liên hệ", href: "/contact" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ease-out ${
          scrolled
            ? "bg-[#0B0F1A]/78 shadow-[0_1px_24px_rgba(0,0,0,0.32)] backdrop-blur-md"
            : "bg-[#0B0F1A]/35 backdrop-blur-[2px]"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 flex-shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            aria-label="SCMD Pro - Trang chủ"
          >
            <SCMDLogo size="md" className="shrink-0 sm:hidden" />
            <SCMDLogo size="lg" className="hidden shrink-0 sm:flex" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={openDropdown === item.label}
                    className={`flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      openDropdown === item.label ? "text-white" : "text-[#A7B4C8] hover:text-white"
                    }`}
                  >
                    {item.label}
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${openDropdown === item.label ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    role="menu"
                    className={`absolute left-0 top-full pt-1.5 transition-all duration-150 ease-out ${
                      openDropdown === item.label
                        ? "pointer-events-auto translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-1 opacity-0"
                    }`}
                  >
                    <div className="w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0F172A] shadow-lg shadow-black/40">
                      {item.children.map((child) => {
                        const isAnchor = child.href.startsWith("#");
                        const finalHref = isAnchor && !isHomePage ? `/${child.href}` : child.href;

                        if (isAnchor) {
                          return (
                            <a
                              key={child.label}
                              href={finalHref}
                              role="menuitem"
                              className="flex flex-col gap-0.5 px-4 py-3 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                            >
                              <span className="text-sm font-semibold text-[#E5E7EB] hover:text-white">{child.label}</span>
                              <span className="text-xs text-[#A7B4C8] hover:text-white/80">{child.desc}</span>
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={child.label}
                            to={finalHref}
                            role="menuitem"
                            className="flex flex-col gap-0.5 px-4 py-3 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                          >
                            <span className="text-sm font-semibold text-[#E5E7EB] hover:text-white">{child.label}</span>
                            <span className="text-xs text-[#A7B4C8] hover:text-white/80">{child.desc}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : item.href.startsWith("#") ? (
                <a
                  key={item.label}
                  href={isHomePage ? item.href : `/${item.href}`}
                  className="rounded-lg px-3.5 py-2 text-sm font-semibold text-[#A7B4C8] transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.href}
                  className="rounded-lg px-3.5 py-2 text-sm font-semibold text-[#A7B4C8] transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/workspace"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[#A7B4C8] transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] px-4 text-sm font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.97] focus-visible:outline-none"
            >
              Dùng thử miễn phí
            </Link>
            <Link
              to="/contact"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold text-[#E5E7EB] transition-all duration-200 ease-out hover:bg-white/5 active:scale-[0.97]"
            >
              Yêu cầu Demo
            </Link>
          </div>

          {scrolled && !mobileOpen && (
            <div className="fixed bottom-4 right-4 z-50 lg:hidden">
              <Link
                to="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all hover:brightness-110 active:scale-[0.97]"
                aria-label="Dùng thử miễn phí SCMD Pro"
              >
                Dùng thử miễn phí
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/workspace"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.07] px-3 text-xs font-bold text-[#F1F5F9] shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="hidden min-[380px]:inline">Đăng nhập</span>
            </Link>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 ease-out hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
              aria-controls="mobile-menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div
          className={`grid overflow-hidden border-t border-white/10 bg-[#0B0F1A] transition-all duration-200 ease-out lg:hidden ${
            mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!mobileOpen}
          id="mobile-menu"
        >
          <div className="min-h-0">
            <nav className="space-y-1 border-b border-white/5 px-5 py-4" aria-label="Menu di động">
              {NAV_ITEMS.map((item) => {
                if (item.children) {
                  return (
                    <div key={item.label} className="rounded-xl bg-white/[0.03] px-3 py-3">
                      <div className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#93C5FD]">
                        {item.label}
                      </div>
                      <div className="space-y-1">
                        {item.children.map((child) => (
                          <a
                            key={child.label}
                            href={isHomePage ? child.href : `/${child.href}`}
                            onClick={() => setMobileOpen(false)}
                            className="flex flex-col rounded-lg px-3 py-2.5 transition-colors duration-200 ease-out hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                          >
                            <span className="text-sm font-semibold text-[#F1F5F9]">{child.label}</span>
                            <span className="text-xs text-[#A7B4C8]">{child.desc}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }

                return item.href.startsWith("#") ? (
                  <a
                    key={item.label}
                    href={isHomePage ? item.href : `/${item.href}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-semibold text-[#E5E7EB] transition-colors duration-200 ease-out hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-semibold text-[#E5E7EB] transition-colors duration-200 ease-out hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                <Link
                  to="/workspace"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-bold text-[#E5E7EB] transition-colors duration-200 ease-out hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Đăng nhập hệ thống
                </Link>
                <Link
                  to="/register"
                  className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none"
                >
                  Dùng thử miễn phí
                </Link>
              </div>
            </nav>
          </div>
        </div>
        <div className="relative h-px w-full bg-white/8" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-px w-[min(760px,72vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#34D399]/70 to-transparent" />
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          aria-hidden={!mobileOpen}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
