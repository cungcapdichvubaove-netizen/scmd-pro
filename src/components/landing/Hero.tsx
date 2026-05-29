import { typography, spacing } from "@/design-system/tokens";

export default function Hero() {
  return (
    <section className={spacing.section}>
      <div className={spacing.container}>
        <div className="max-w-3xl">
          <h1 className={typography.h1}>
            Nền tảng giám sát & vận hành dịch vụ bảo vệ theo thời gian thực
          </h1>

          <p className={`mt-6 ${typography.body}`}>
            Chuẩn hóa quy trình, giảm rủi ro vận hành, kiểm soát toàn bộ lực lượng
            bảo vệ trên một hệ thống duy nhất.
          </p>
        </div>
      </div>
    </section>
  );
}