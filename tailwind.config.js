/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hệ thống màu nhận diện thương hiệu SCMD PRO Brand Identity v2.4
        'scmd-navy': 'var(--color-header)',       // Nền chính trung tâm chỉ huy
        'scmd-slate': 'var(--color-surface)',     // Màu các khối Card/Component
        'scmd-cyber': 'var(--color-primary)',     // Xanh hành động, phản quang
        'scmd-safety': 'var(--color-success)',    // Xanh an toàn
        'scmd-alert': 'var(--color-danger)',      // Đỏ báo động

        'scmd-primary': 'var(--color-primary)',   
        'scmd-success': 'var(--color-success)',   
        'scmd-error':   'var(--color-danger)',    

        primary: "var(--color-primary)",
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'scmd':    'var(--radius-sm)', /* button */
        'xl':      '0.75rem',
        '2xl':     '1rem',
        '3xl':     '1.5rem',

        'scmd-sm': 'var(--radius-xs)',    /* 4px */
        'scmd-md': 'var(--radius-sm)',    /* 6px */
        'scmd-lg': 'var(--radius-lg)',    /* 16px */
        'scmd-xl': 'var(--radius-xl)',    /* 24px */
      },
      boxShadow: {
        'scmd-deep': 'var(--shadow-md)',
        'scmd-glow': 'var(--shadow-sm)',
        'deep':      'var(--shadow-lg)',
        'scmd-lg': 'var(--shadow-md)',
      },
      letterSpacing: {
        'tight': '-0.02em',
      },
      lineHeight: {
        'relaxed': '1.6',
      },
    },
  },
  plugins: [],
}