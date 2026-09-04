import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Дизайн-система ADATA 2026 (Figma: DESIGN SYSTEM — 2026).
 *
 * Правила:
 * 1. Шрифт — Open Sans, минимальный размер текста 12px.
 * 2. Сетка отступов 4px; шкала повторяет space/* из Figma.
 * 3. Бренд-цвет — brand/500 #068dff. Токены хранятся HSL-триплетами,
 *    поэтому модификаторы прозрачности (bg-primary/10) продолжают работать.
 * 4. Радиусы — radius/* из Figma: 4 / 6 / 8 / 10 / 12 / 16 / 20 / full.
 */
const hsl = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-open-sans)", "system-ui", "sans-serif"],
      },

      /**
       * Тайп-скейл дизайн-системы. letterSpacing в Figma задан в процентах,
       * поэтому здесь он выражен в em (−2% → −0.02em).
       */
      fontSize: {
        // Body/Small · Caption
        xs: ["12px", { lineHeight: "16px", letterSpacing: "0" }],
        // Body/Medium · Label/Medium
        sm: ["14px", { lineHeight: "20px", letterSpacing: "0" }],
        // Body/Large · Label/Large · Heading/H5
        base: ["16px", { lineHeight: "24px", letterSpacing: "0" }],
        // Heading/H4
        h4: ["18px", { lineHeight: "28px", letterSpacing: "-0.005em" }],
        // Heading/H3
        lg: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        // Heading/H2
        xl: ["24px", { lineHeight: "32px", letterSpacing: "-0.015em" }],
        // Heading/H1
        "2xl": ["28px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
        // Display/Small
        "3xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.015em" }],
        // Display/Large
        "4xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em" }],
        // Display/Hero
        "5xl": ["60px", { lineHeight: "72px", letterSpacing: "-0.025em" }],
        // Overline — версалы с разрядкой
        overline: ["12px", { lineHeight: "16px", letterSpacing: "0.02em" }],
      },

      colors: {
        border: hsl("border"),
        input: hsl("input"),
        ring: hsl("ring"),
        background: hsl("background"),
        foreground: hsl("foreground"),

        brand: {
          50: hsl("brand-50"),
          100: hsl("brand-100"),
          200: hsl("brand-200"),
          300: hsl("brand-300"),
          400: hsl("brand-400"),
          500: hsl("brand-500"),
          /* Подложка брендовых подсказок и наведения — #F0F8FF. */
          subtle: hsl("bg-brand-subtle"),
          600: hsl("brand-600"),
          700: hsl("brand-700"),
          DEFAULT: hsl("brand-500"),
        },
        primary: {
          DEFAULT: hsl("primary"),
          foreground: hsl("primary-foreground"),
          hover: hsl("action-primary-hover"),
          active: hsl("action-primary-active"),
        },
        secondary: {
          DEFAULT: hsl("secondary"),
          foreground: hsl("secondary-foreground"),
        },
        muted: {
          DEFAULT: hsl("muted"),
          foreground: hsl("muted-foreground"),
        },
        accent: {
          DEFAULT: hsl("accent"),
          foreground: hsl("accent-foreground"),
        },
        destructive: {
          DEFAULT: hsl("destructive"),
          foreground: hsl("destructive-foreground"),
        },
        card: {
          DEFAULT: hsl("card"),
          foreground: hsl("card-foreground"),
        },

        /*
          Поверхность карточки — F9FAFB. В разметке идёт с прозрачностью
          (bg-surface/20), как в макете. Отдельный цвет, а не card: на bg-card
          сидят кнопки, поля, панели и сайдбар — они остаются белыми.
        */
        surface: hsl("surface"),

        canvas: hsl("bg-canvas"),
        badge: hsl("bg-badge"),
        /* Затемнение под шторками: bg-overlay/50, bg-overlay/65. */
        overlay: hsl("bg-overlay"),

        // Поля ввода
        field: {
          /** Рамка поля — темнее border/strong, чтобы поле читалось на белом. */
          DEFAULT: hsl("border-field"),
          text: hsl("input-text"),
          helper: hsl("input-helper"),
        },

        // Текстовые роли
        subtle: hsl("text-secondary"),
        faint: hsl("text-disabled"),
        link: {
          DEFAULT: hsl("text-link"),
          hover: hsl("text-link-hover"),
        },

        // Статусы
        success: {
          DEFAULT: hsl("bg-success"),
          subtle: hsl("bg-success-subtle"),
          foreground: hsl("text-success"),
          border: hsl("border-success"),
        },
        warning: {
          DEFAULT: hsl("bg-warning"),
          subtle: hsl("bg-warning-subtle"),
          foreground: hsl("text-warning"),
          border: hsl("border-warning"),
        },
        danger: {
          DEFAULT: hsl("action-danger"),
          hover: hsl("action-danger-hover"),
          active: hsl("action-danger-active"),
          subtle: hsl("bg-danger-subtle"),
          foreground: hsl("action-danger-fg"),
          border: hsl("border-danger"),
        },

        // Границы и иконки
        strong: hsl("border-strong"),
        icon: {
          DEFAULT: hsl("icon-default"),
          strong: hsl("icon-strong"),
          secondary: hsl("icon-secondary"),
          disabled: hsl("icon-disabled"),
          brand: hsl("icon-brand"),
          success: hsl("icon-success"),
          warning: hsl("icon-warning"),
          danger: hsl("icon-danger"),
        },

        // Акцентные оттенки для категорий и бейджей
        hue: {
          red: hsl("hue-red"),
          "red-subtle": hsl("hue-red-subtle"),
          orange: hsl("hue-orange"),
          "orange-subtle": hsl("hue-orange-subtle"),
          amber: hsl("hue-amber"),
          "amber-subtle": hsl("hue-amber-subtle"),
          green: hsl("hue-green"),
          "green-subtle": hsl("hue-green-subtle"),
          emerald: hsl("hue-emerald"),
          "emerald-subtle": hsl("hue-emerald-subtle"),
          teal: hsl("hue-teal"),
          "teal-subtle": hsl("hue-teal-subtle"),
          cyan: hsl("hue-cyan"),
          "cyan-subtle": hsl("hue-cyan-subtle"),
          sky: hsl("hue-sky"),
          "sky-subtle": hsl("hue-sky-subtle"),
          blue: hsl("hue-blue"),
          "blue-subtle": hsl("hue-blue-subtle"),
          indigo: hsl("hue-indigo"),
          "indigo-subtle": hsl("hue-indigo-subtle"),
          violet: hsl("hue-violet"),
          "violet-subtle": hsl("hue-violet-subtle"),
          purple: hsl("hue-purple"),
          "purple-subtle": hsl("hue-purple-subtle"),
          pink: hsl("hue-pink"),
          "pink-subtle": hsl("hue-pink-subtle"),
          rose: hsl("hue-rose"),
          "rose-subtle": hsl("hue-rose-subtle"),
        },
      },

      /**
       * Порог 1440 — рабочие мониторы в офисе. Шире него колонка диалога
       * получает 400, уже — 340.
       */
      screens: {
        wide: "1440px",
      },

      /** radius/* из Figma. */
      /**
       * Тени карточек разговора: та же пара, что в ассистенте комплаенса —
       * едва заметный контур снизу, без «парения».
       */
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)",
        "card-hover":
          "0 4px 12px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.06)",
        composer: "0 10px 36px -10px hsl(var(--brand-500) / 0.40)",
        glyph: "0 8px 24px -6px hsl(var(--brand-600) / 0.45)",
        /*
          Всплывающие поверхности ДС: меню, шторка, тост, подсказка графика.
          Оттенок тени — 43/61/79, тот же, что у основного текста.
        */
        pop: "0px 8px 24px -4px rgba(43, 61, 79, 0.12)",
        /** То же, но для поверхностей поверх поверхностей: панель над шторкой. */
        "pop-strong": "0px 8px 24px -4px rgba(43, 61, 79, 0.18)",
        /** Приподнятый сегмент: активная вкладка сегментного переключателя. */
        segment: "0px 1px 3px 0px rgba(43, 61, 79, 0.10)",
        /** Поле ввода — контур снизу, чтобы поле не сливалось с карточкой. */
        field: "0px 1px 2px rgba(16, 24, 40, 0.05)",
        /** Кольцо фокуса поля и раскрытого списка. */
        "focus-ring": "0px 0px 0px 3px hsl(var(--primary) / 0.18)",
        /** Свечение кнопки ассистента и её язычка у края экрана. */
        glow: "0 12px 28px hsl(var(--primary) / 0.45)",
        "glow-soft": "0 8px 24px hsl(var(--primary) / 0.35)",
        /** Окно разговора в углу экрана — глубже обычной поверхности. */
        window: "0px 20px 60px -15px rgba(0, 0, 0, 0.12)",
      },

      borderRadius: {
        none: "0",
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        "10": "10px",
        "12": "12px",
        lg: "var(--radius)", // 12px
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },

      /** Волосяная рамка 0.66px — из компонента Toggle (Figma 285:5554). */
      borderWidth: {
        hair: "0.66px",
        half: "0.5px",
      },

      /** space/* из Figma — совпадает с Tailwind, кроме 14 (52) и 18 (72). */
      spacing: {
        "14": "52px",
        "18": "72px",
        /**
         * Значок 18 — ступень из макета кнопок (icon/md), а не отступ:
         * сетка 4px управляет расстояниями, размеры значков идут своей
         * шкалой 14 / 16 / 18 / 20 / 24. Даёт size-4.5, h-4.5, w-4.5.
         */
        "4.5": "18px",
        /** Свёрнутый рельс навигации — 76 по макету ДС. */
        "19": "76px",
      },
    },
  },
  /* Импортом, а не require: конфиг грузится и как ESM (горячая
     перезагрузка), где require не определён. */
  plugins: [animate],
};

export default config;
