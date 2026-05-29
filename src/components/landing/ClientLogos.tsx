const CLIENT_LOGOS = [
  "VINHOMES",
  "SAMSUNG",
  "VINCOM",
  "Viettel",
  "BIDV",
  "HAVAN",
  "Grab",
  "LOTTE",
];

export default function ClientLogos() {
  return (
    <section
      className="border-y border-white/[0.06] bg-[#080C16] py-6 sm:py-7"
      aria-label="Đối tác tin dùng"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9AA8BD]">
          Được tin dùng bởi các đội vận hành an ninh doanh nghiệp
        </p>
        <div
          className="grid grid-cols-2 items-center gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-8"
          aria-label="Danh sách đối tác"
        >
          {CLIENT_LOGOS.map((logo) => (
            <span
              key={logo}
              className="select-none text-sm font-black tracking-tight text-[#CBD5E1]/70 transition-colors duration-200 hover:text-white"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              aria-label={logo}
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
