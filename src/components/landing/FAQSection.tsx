import { useState } from "react";

const FAQS = [
  {
    question: "SCMD Pro có phù hợp với doanh nghiệp nhỏ không?",
    answer:
      "Có. SCMD Pro có gói Starter miễn phí phù hợp cho doanh nghiệp nhỏ với tối đa 1 quản lý và 2 nhân viên, đầy đủ tính năng cơ bản cần thiết để bắt đầu.",
  },
  {
    question: "Dữ liệu của tôi có được bảo mật không?",
    answer:
      "Dữ liệu được mã hóa AES-256 và lưu trữ trên server đạt chuẩn ISO 27001. Row-Level Security PostgreSQL cô lập tuyệt đối dữ liệu từng tenant. Chúng tôi cam kết bảo mật tuyệt đối.",
  },
  {
    question: "Tôi có thể dùng thử miễn phí không?",
    answer:
      "Có. Bạn có thể dùng thử miễn phí 14 ngày với đầy đủ tính năng gói Enterprise PRO, không cần thẻ tín dụng. Đội ngũ hỗ trợ sẽ onboarding miễn phí.",
  },
  {
    question: "SCMD Pro có tích hợp với hệ thống khác không?",
    answer:
      "Gói SCMD Pro Max cung cấp API Access đầy đủ để tích hợp với ERP, HRM và các hệ thống nội bộ khác. Đội ngũ kỹ thuật hỗ trợ on-site để tùy biến luồng dữ liệu phù hợp.",
  },
  {
    question: "SCMD Pro có hỗ trợ chống gian lận vị trí GPS không?",
    answer:
      "Có. Hệ thống tích hợp thuật toán phát hiện Mock GPS Location, xác thực Haversine dưới 50m và gắn watermark GPS cùng timestamp trực tiếp lên ảnh bằng chứng. Mọi bất thường tự động gắn cờ SUSPICIOUS.",
  },
  {
    question: "Làm thế nào để được hỗ trợ khi gặp vấn đề?",
    answer:
      "Chúng tôi hỗ trợ 24/7 qua chat, email và hotline. Thời gian phản hồi trung bình dưới 15 phút. Gói Enterprise PRO trở lên được tư vấn bảo mật 1:1 chuyên sâu.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const midpoint = Math.ceil(FAQS.length / 2);
  const columns = [FAQS.slice(0, midpoint), FAQS.slice(midpoint)];

  return (
    <section
      className="border-t border-white/[0.04] bg-[#080C18] py-16 lg:py-20"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3B82F6]">
            Câu hỏi thường gặp
          </div>
          <h2
            id="faq-heading"
            className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl"
          >
            Câu hỏi thường gặp
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#64748B]">
            Các câu trả lời quan trọng nhất được đưa lên đầu để người dùng ra quyết định nhanh hơn.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          {columns.map((items, columnIndex) => (
            <div key={columnIndex} className="space-y-3" role="list">
              {items.map((faq, itemIndex) => {
                const index = columnIndex * midpoint + itemIndex;
                const isOpen = openIndex === index;
                const panelId = `faq-panel-${index}`;
                const buttonId = `faq-button-${index}`;

                return (
                  <div
                    key={faq.question}
                    role="listitem"
                    className={`overflow-hidden rounded-2xl border transition-all duration-200 ease-out ${
                      isOpen
                        ? "border-[#3B82F6]/20 bg-[#3B82F6]/6"
                        : "border-white/[0.06] bg-white/[0.03] hover:border-white/10"
                    }`}
                  >
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-inset"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      <span className="pr-2 text-sm font-semibold leading-snug text-[#E2E8F0]">
                        {faq.question}
                      </span>
                      <span
                        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 ease-out ${
                          isOpen ? "bg-[#3B82F6] text-white" : "bg-white/5 text-[#475569]"
                        }`}
                        aria-hidden="true"
                      >
                        <svg
                          className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>

                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={`grid transition-all duration-200 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="border-t border-white/5 px-5 pb-4 pt-3 text-sm leading-relaxed text-[#94A3B8]">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#475569]">
          Còn câu hỏi khác?{" "}
          <a
            href="/contact"
            className="rounded font-semibold text-[#3B82F6] transition-colors hover:text-[#60A5FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2"
          >
            Liên hệ đội ngũ hỗ trợ →
          </a>
        </p>
      </div>
    </section>
  );
}
