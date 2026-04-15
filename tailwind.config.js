/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hệ thống màu nhận diện thương hiệu SCMD (NOC Dark Mode)
        'scmd-navy': '#0B1120',   // Nền chính trung tâm chỉ huy
        'scmd-slate': '#1E293B',  // Màu các khối Card/Component
        'scmd-cyber': '#3B82F6',  // Xanh hành động, phản quang
        'scmd-safety': '#10B981', // Xanh an toàn
        'scmd-alert': '#EF4444',  // Đỏ báo động
        
        // Giữ lại các alias cũ để đảm bảo tương thích ngược nếu cần
        primary: "#3B82F6",
        background: "#0B1120",
        surface: "#1E293B",
        success: "#10B981",
        danger: "#EF4444",
      },
      fontFamily: {
        // Sử dụng Inter làm phông chữ tiêu chuẩn cho toàn bộ hệ thống
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        // Bo góc scmd tiêu chuẩn (12px) theo mã gen thương hiệu
        'scmd': '12px',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        // Hiệu ứng chiều sâu cho các thành phần chiến lược
        'scmd-deep': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        'scmd-glow': '0 0 15px rgba(59, 130, 246, 0.5)',
        'deep': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      },
      letterSpacing: {
        // Tracking tight cho các tiêu đề để tạo sự chuyên nghiệp
        'tight': '-0.02em',
      },
      lineHeight: {
        // Leading relaxed cho nội dung văn bản để dễ đọc hơn
        'relaxed': '1.625',
      },
    },
  },
  plugins: [],
}
