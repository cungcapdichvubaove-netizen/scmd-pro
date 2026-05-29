// Stats từ SCMDProLanding.jsx — merged với existing StatsSection.tsx icons

const STAT_COLORS: Record<string, string> = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  amber: 'text-amber-500',
  purple: 'text-purple-500',
};

const STATS = [
  {
    value: "500+",
    label: "Doanh nghiệp tin dùng",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    colorKey: "blue",
  },
  {
    value: "10,000+",
    label: "Người dùng hàng ngày",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    colorKey: "green",
  },
  {
    value: "99.99%",
    label: "Uptime SLA cam kết",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    colorKey: "amber",
  },
  {
    value: "24/7",
    label: "Hỗ trợ khách hàng",
    icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
    colorKey: "purple",
  },
];

export function StatsSection() {
  return (
    <section
      className="border-t border-white/[0.04] bg-[#0A0E1A] py-12"
      aria-label="Thống kê hệ thống"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5 lg:grid-cols-4 lg:divide-y-0">
          {STATS.map((stat) => {
            const colorClass = STAT_COLORS[stat.colorKey] ?? STAT_COLORS.blue;

            return (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center gap-3 bg-[#0F172A] px-6 py-8 text-center sm:flex-row sm:items-center sm:text-left lg:flex-col lg:text-center"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <svg
                    className={`h-5 w-5 ${colorClass}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
                <div>
                  <div
                    className={`text-[2rem] font-bold leading-none tracking-tight ${colorClass}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#94A3B8]">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
