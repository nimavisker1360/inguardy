"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type MotionProps } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Download,
  FileText,
  LineChart,
  ListChecks,
  Menu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type HTMLAttributes,
} from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/language-context";

type MenuItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent?: string;
  preview?: string;
  previewPosition?: string;
};

type DesktopMenu = "products" | "solutions" | "resources";

const MotionDiv = motion.div as ComponentType<
  MotionProps & HTMLAttributes<HTMLDivElement>
>;
const MotionSpan = motion.span as ComponentType<
  MotionProps & HTMLAttributes<HTMLSpanElement>
>;

const primaryProducts: MenuItem[] = [
  {
    title: "Trading Journal",
    description: "Log trades, screenshots, notes, emotions, mistakes, and strategy context.",
    href: "/products/trading-journal",
    icon: BookOpen,
    accent: "from-violet-500/20 via-sky-50 to-white",
    preview: "/images/001.png",
    previewPosition: "center top",
  },
  {
    title: "Analytics & Reports",
    description: "Turn your journal into clear performance patterns and actionable reports.",
    href: "/products/analytics-reports",
    icon: BarChart3,
    accent: "from-blue-500/20 via-cyan-50 to-white",
    preview: "/images/004.png",
    previewPosition: "left top",
  },
  {
    title: "AI Trade Review",
    description: "Review execution, risk, psychology, and discipline with structured AI feedback.",
    href: "/products/ai-trade-review",
    icon: Sparkles,
    accent: "from-pink-500/20 via-rose-50 to-white",
    preview: "/images/002.png",
    previewPosition: "center top",
  },
];

const productTools: MenuItem[] = [
  {
    title: "MT5 Auto Sync",
    description: "Connect MetaTrader 5 and automate trade logging.",
    href: "/products/mt5-auto-sync",
    icon: RefreshCw,
  },
  {
    title: "Playbooks",
    description: "Build and track the rules behind each strategy.",
    href: "/products/playbooks",
    icon: ListChecks,
  },
  {
    title: "Checklists",
    description: "Protect your process before and after every trade.",
    href: "/products/checklists",
    icon: ShieldCheck,
  },
  {
    title: "Trade Calendar",
    description: "See daily PnL and trading activity at a glance.",
    href: "/products/trade-calendar",
    icon: CalendarDays,
  },
  {
    title: "Prop Firm Tracker",
    description: "Monitor targets, drawdown, and challenge progress.",
    href: "/products/prop-firm-tracker",
    icon: Trophy,
  },
  {
    title: "Trading Signals",
    description: "Browse structured forex and gold trade ideas.",
    href: "/products/trading-signals",
    icon: LineChart,
  },
];

const solutionItems: MenuItem[] = [
  {
    title: "Automate My Journal",
    description: "Import MT5 trades automatically and spend less time entering data.",
    href: "/trading-goals/automate-my-journal",
    icon: RefreshCw,
  },
  {
    title: "Analyze My Performance",
    description: "Find the sessions, symbols, setups, and habits shaping your results.",
    href: "/trading-goals/analyze-my-performance",
    icon: BarChart3,
  },
  {
    title: "Improve My Discipline",
    description: "Use playbooks, checklists, and daily reviews to trade your plan.",
    href: "/trading-goals/improve-my-discipline",
    icon: Target,
  },
  {
    title: "Review Trades With AI",
    description: "Turn each closed trade into specific, practical feedback.",
    href: "/trading-goals/review-trades-with-ai",
    icon: Sparkles,
  },
  {
    title: "Track Prop Firm Rules",
    description: "Stay aware of profit targets, daily loss, and drawdown limits.",
    href: "/trading-goals/track-prop-firm-rules",
    icon: Trophy,
  },
];

const resourceItems: MenuItem[] = [
  {
    title: "Blog",
    description: "Practical ideas about journaling, discipline, risk, and analytics.",
    href: "/blog",
    icon: FileText,
  },
  {
    title: "User Guide",
    description: "Open the dashboard and follow the step-by-step product tutorial.",
    href: "/dashboard",
    icon: BookOpen,
  },
  {
    title: "MT5 Setup",
    description: "Connect an account and generate your secure quick-connect details.",
    href: "/dashboard/accounts",
    icon: RefreshCw,
  },
  {
    title: "Download MT5 EA",
    description: "Download the Tradivix recorder for MetaTrader 5.",
    href: "/api/downloads/trade-journal-recorder",
    icon: Download,
  },
  {
    title: "About Tradivix",
    description: "Learn what we are building for serious, process-driven traders.",
    href: "/about",
    icon: Zap,
  },
  {
    title: "Contact Us",
    description: "Ask a question or get help from the Tradivix team.",
    href: "/contact",
    icon: CircleHelp,
  },
];

const navbarCopy = {
  en: {
    products: "Products",
    solutions: "Solutions",
    resources: "Resources",
    mt5Sync: "MT5 Sync",
    pricing: "Pricing",
    login: "Log In",
    dashboard: "Dashboard",
    toggleNavigation: "Toggle navigation",
    moreTools: "More Tradivix tools",
    byGoal: "By trading goal",
    chooseGoal: "Choose what you want to improve.",
    resourcesEyebrow: "Resources",
    resourcesTitle: "Learn, connect, and get support.",
    contactHelp: "Need help? Contact us",
    openProduct: "Open product",
    english: "English",
    persian: "Persian",
  },
  fa: {
    products: "محصولات",
    solutions: "راهکارها",
    resources: "منابع",
    mt5Sync: "همگام‌سازی MT5",
    pricing: "قیمت‌گذاری",
    login: "ورود",
    dashboard: "داشبورد",
    toggleNavigation: "باز و بسته کردن منو",
    moreTools: "ابزارهای بیشتر Tradivix",
    byGoal: "بر اساس هدف معاملاتی",
    chooseGoal: "انتخاب کنید چه چیزی را می‌خواهید بهتر کنید.",
    resourcesEyebrow: "منابع",
    resourcesTitle: "یاد بگیرید، ارتباط بگیرید و پشتیبانی دریافت کنید.",
    contactHelp: "کمک می‌خواهید؟ تماس بگیرید",
    openProduct: "باز کردن محصول",
    english: "انگلیسی",
    persian: "فارسی",
  },
} as const;

const menuItemCopy = {
  fa: {
    "/products/trading-journal": {
      title: "ژورنال معاملاتی",
      description:
        "معاملات، اسکرین‌شات‌ها، یادداشت‌ها، احساسات، اشتباهات و زمینه استراتژی را ثبت کنید.",
    },
    "/products/analytics-reports": {
      title: "تحلیل و گزارش‌ها",
      description:
        "ژورنال خود را به الگوهای عملکردی روشن و گزارش‌های کاربردی تبدیل کنید.",
    },
    "/products/ai-trade-review": {
      title: "بررسی معامله با AI",
      description:
        "اجرا، ریسک، روان‌شناسی و نظم را با بازخورد ساختاریافته AI مرور کنید.",
    },
    "/products/mt5-auto-sync": {
      title: "همگام‌سازی خودکار MT5",
      description: "MetaTrader 5 را وصل کنید و ثبت معاملات را خودکار کنید.",
    },
    "/products/playbooks": {
      title: "پلی‌بوک‌ها",
      description: "قوانین پشت هر استراتژی را بسازید و دنبال کنید.",
    },
    "/products/checklists": {
      title: "چک‌لیست‌ها",
      description: "قبل و بعد از هر معامله از فرایند خود محافظت کنید.",
    },
    "/products/trade-calendar": {
      title: "تقویم معاملاتی",
      description: "سود و زیان روزانه و فعالیت معاملاتی را سریع ببینید.",
    },
    "/products/prop-firm-tracker": {
      title: "ردیاب پراپ فرم",
      description: "اهداف، افت سرمایه و پیشرفت چالش را پایش کنید.",
    },
    "/products/trading-signals": {
      title: "سیگنال‌های معاملاتی",
      description: "ایده‌های ساختاریافته فارکس و طلا را مرور کنید.",
    },
    "/trading-goals/automate-my-journal": {
      title: "ژورنال من را خودکار کن",
      description:
        "معاملات MT5 را خودکار وارد کنید و زمان کمتری برای ورود داده بگذارید.",
    },
    "/trading-goals/analyze-my-performance": {
      title: "عملکردم را تحلیل کن",
      description:
        "سشن‌ها، نمادها، ستاپ‌ها و عادت‌هایی را پیدا کنید که نتیجه شما را می‌سازند.",
    },
    "/trading-goals/improve-my-discipline": {
      title: "نظم معاملاتی‌ام را بهتر کن",
      description:
        "با پلی‌بوک، چک‌لیست و مرور روزانه طبق برنامه معامله کنید.",
    },
    "/trading-goals/review-trades-with-ai": {
      title: "معاملات را با AI مرور کن",
      description: "هر معامله بسته را به بازخورد مشخص و کاربردی تبدیل کنید.",
    },
    "/trading-goals/track-prop-firm-rules": {
      title: "قوانین پراپ فرم را دنبال کن",
      description: "از اهداف سود، حد ضرر روزانه و محدودیت افت سرمایه آگاه بمانید.",
    },
    "/blog": {
      title: "وبلاگ",
      description: "ایده‌های کاربردی درباره ژورنال، نظم، ریسک و تحلیل.",
    },
    "/dashboard": {
      title: "راهنمای کاربر",
      description: "داشبورد را باز کنید و آموزش مرحله‌به‌مرحله محصول را دنبال کنید.",
    },
    "/dashboard/accounts": {
      title: "راه‌اندازی MT5",
      description: "یک حساب وصل کنید و اطلاعات اتصال امن خود را بسازید.",
    },
    "/api/downloads/trade-journal-recorder": {
      title: "دانلود EA متاتریدر 5",
      description: "ضبط‌کننده Tradivix را برای MetaTrader 5 دانلود کنید.",
    },
    "/about": {
      title: "درباره Tradivix",
      description:
        "ببینید برای معامله‌گران جدی و فرایندمحور چه چیزی می‌سازیم.",
    },
    "/contact": {
      title: "تماس با ما",
      description: "سوال بپرسید یا از تیم Tradivix کمک بگیرید.",
    },
  },
} as const;

function localizeMenuItems(items: MenuItem[], language: "en" | "fa") {
  if (language === "en") {
    return items;
  }

  return items.map((item) => {
    const localized =
      menuItemCopy.fa[item.href as keyof typeof menuItemCopy.fa];

    return localized ? { ...item, ...localized } : item;
  });
}

const hiddenNavbarPrefixes = [
  "/dashboard",
  "/journal",
  "/admin",
  "/economic-calendar",
  "/premium",
  "/sign-up",
  "/sign-in",
  "/login",
];

export function Navbar() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const isRtl = language === "fa";
  const copy = navbarCopy[language];
  const localizedPrimaryProducts = localizeMenuItems(primaryProducts, language);
  const localizedProductTools = localizeMenuItems(productTools, language);
  const localizedSolutionItems = localizeMenuItems(solutionItems, language);
  const localizedResourceItems = localizeMenuItems(resourceItems, language);
  const [desktopMenu, setDesktopMenu] = useState<DesktopMenu | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<DesktopMenu | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openMenuWithIntent = (menu: DesktopMenu) => {
    clearCloseTimer();
    clearOpenTimer();
    openTimer.current = setTimeout(() => {
      setDesktopMenu(menu);
      openTimer.current = null;
    }, desktopMenu ? 90 : 130);
  };

  const closeMenuWithIntent = (delay = 210) => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setDesktopMenu(null);
      closeTimer.current = null;
    }, delay);
  };

  const openMenuImmediately = (menu: DesktopMenu) => {
    clearOpenTimer();
    clearCloseTimer();
    setDesktopMenu(menu);
  };

  useEffect(() => {
    setDesktopMenu(null);
    setIsMobileMenuOpen(false);
    setMobileSection(null);
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearOpenTimer();
        clearCloseTimer();
        setDesktopMenu(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      clearOpenTimer();
      clearCloseTimer();
    };
  }, []);

  if (hiddenNavbarPrefixes.some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }

  const navLinkClass =
    "inline-flex h-11 items-center gap-1 rounded-xl px-3 text-[15px] font-semibold text-[#090d25] outline-none transition-colors hover:bg-slate-100 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-400";
  const ctaClass =
    "h-12 rounded-lg border-0 bg-gradient-to-r from-violet-600 to-pink-500 px-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(168,85,247,0.28)] transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-pink-500 hover:text-white";

  return (
    <nav
      dir={isRtl ? "rtl" : "ltr"}
      style={{ position: "sticky", top: 0 }}
      className={`z-50 w-full border-b border-slate-200 bg-white text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ${
        isRtl ? "landing-fa-font text-right" : "landing-en-font text-left"
      }`}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={() => closeMenuWithIntent()}
    >
      <div className="container mx-auto flex h-20 max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Tradivix home"
          onMouseEnter={() => closeMenuWithIntent(140)}
        >
          <Image
            src="/images/tradivix_logo_dark.png"
            alt="Tradivix"
            width={180}
            height={78}
            priority
            className="h-11 w-auto object-contain"
          />
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          <DesktopTrigger
            label={copy.products}
            menu="products"
            isOpen={desktopMenu === "products"}
            className={navLinkClass}
            onOpen={openMenuWithIntent}
            onFocusOpen={openMenuImmediately}
            onClose={() => closeMenuWithIntent(120)}
          />
          <DesktopTrigger
            label={copy.solutions}
            menu="solutions"
            isOpen={desktopMenu === "solutions"}
            className={navLinkClass}
            onOpen={openMenuWithIntent}
            onFocusOpen={openMenuImmediately}
            onClose={() => closeMenuWithIntent(120)}
          />
          <Link
            href="/products/mt5-auto-sync"
            className={navLinkClass}
            onMouseEnter={() => closeMenuWithIntent(140)}
          >
            {copy.mt5Sync}
          </Link>
          <Link
            href="/#pricing"
            className={navLinkClass}
            onMouseEnter={() => closeMenuWithIntent(140)}
          >
            {copy.pricing}
          </Link>
          <DesktopTrigger
            label={copy.resources}
            menu="resources"
            isOpen={desktopMenu === "resources"}
            className={navLinkClass}
            onOpen={openMenuWithIntent}
            onFocusOpen={openMenuImmediately}
            onClose={() => closeMenuWithIntent(120)}
          />
        </div>

        <div
          className="flex items-center gap-2 xl:gap-3"
          onMouseEnter={() => closeMenuWithIntent(140)}
        >
          <div className="hidden items-center gap-2 lg:flex">
            <LanguagePill language={language} onSelectLanguage={setLanguage} />
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center rounded-lg px-3 text-[15px] font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              {copy.login}
            </Link>
            <Button asChild className={ctaClass}>
              <Link href="/dashboard" className="flex items-center gap-2">
                {copy.dashboard}{" "}
                <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-expanded={isMobileMenuOpen}
            aria-label={copy.toggleNavigation}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="text-slate-950 hover:bg-slate-100 lg:hidden"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <DesktopMegaMenu activeMenu={desktopMenu} isRtl={isRtl} language={language} />

      <AnimatePresence initial={false}>
        {isMobileMenuOpen && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
          >
            <div className="max-h-[calc(100vh-5rem)] space-y-2 overflow-y-auto p-4">
              <MobileSection
                title={copy.products}
                section="products"
                items={[...localizedPrimaryProducts, ...localizedProductTools]}
                activeSection={mobileSection}
                onToggle={setMobileSection}
              />
              <MobileSection
                title={copy.solutions}
                section="solutions"
                items={localizedSolutionItems}
                activeSection={mobileSection}
                onToggle={setMobileSection}
              />
              <Link href="/products/mt5-auto-sync" className="block rounded-xl px-4 py-3 text-sm font-bold hover:bg-slate-50">
                {copy.mt5Sync}
              </Link>
              <Link href="/#pricing" className="block rounded-xl px-4 py-3 text-sm font-bold hover:bg-slate-50">
                {copy.pricing}
              </Link>
              <MobileSection
                title={copy.resources}
                section="resources"
                items={localizedResourceItems}
                activeSection={mobileSection}
                onToggle={setMobileSection}
              />
              <div className="grid gap-3 border-t border-slate-200 pt-4">
                <Link href="/sign-in" className="flex h-12 items-center justify-center rounded-xl border border-slate-200 font-bold">
                  {copy.login}
                </Link>
                <Link href="/dashboard" className={`${ctaClass} flex items-center justify-center gap-2`}>
                  {copy.dashboard}{" "}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                </Link>
                <div className="flex justify-center">
                  <LanguagePill language={language} onSelectLanguage={setLanguage} />
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </nav>
  );
}

function DesktopTrigger({
  label,
  menu,
  isOpen,
  className,
  onOpen,
  onFocusOpen,
  onClose,
}: {
  label: string;
  menu: DesktopMenu;
  isOpen: boolean;
  className: string;
  onOpen: (menu: DesktopMenu) => void;
  onFocusOpen: (menu: DesktopMenu) => void;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      className={`${className} ${isOpen ? "bg-slate-100 text-violet-700" : ""}`}
      onMouseEnter={() => onOpen(menu)}
      onFocus={() => onFocusOpen(menu)}
      onClick={() => (isOpen ? onClose() : onOpen(menu))}
    >
      {label}
      <span className="inline-flex">
        <MotionSpan
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDown className="h-4 w-4" />
        </MotionSpan>
      </span>
    </button>
  );
}

function DesktopMegaMenu({
  activeMenu,
  isRtl,
  language,
}: {
  activeMenu: DesktopMenu | null;
  isRtl: boolean;
  language: "en" | "fa";
}) {
  const panelWidth =
    activeMenu === "products"
      ? "max-w-[1240px]"
      : activeMenu === "solutions"
        ? "max-w-[900px]"
        : "max-w-[940px]";

  return (
    <AnimatePresence>
      {activeMenu && (
        <MotionDiv
          key="desktop-mega-menu"
          layout
          initial={{
            opacity: 0,
            y: -10,
            clipPath: "inset(0 0 100% 0 round 24px)",
          }}
          animate={{
            opacity: 1,
            y: 0,
            clipPath: "inset(0 0 0% 0 round 24px)",
          }}
          exit={{
            opacity: 0,
            y: -10,
            clipPath: "inset(0 0 100% 0 round 24px)",
          }}
          transition={{ duration: 0.27, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute left-1/2 top-full w-[calc(100vw-2rem)] ${panelWidth} -translate-x-1/2 overflow-hidden rounded-[18px] border border-slate-200/90 bg-white text-slate-950 shadow-[0_30px_70px_-18px_rgba(15,23,42,0.34),0_10px_24px_-14px_rgba(79,70,229,0.22)] ${
            isRtl ? "text-right" : "text-left"
          }`}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <MotionDiv
              key={activeMenu}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.17, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {activeMenu === "products" && (
                <ProductsPanel isRtl={isRtl} language={language} />
              )}
              {activeMenu === "solutions" && <SolutionsPanel language={language} />}
              {activeMenu === "resources" && <ResourcesPanel language={language} />}
            </MotionDiv>
          </AnimatePresence>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

function ProductsPanel({
  isRtl,
  language,
}: {
  isRtl: boolean;
  language: "en" | "fa";
}) {
  const primaryItems = localizeMenuItems(primaryProducts, language);
  const toolItems = localizeMenuItems(productTools, language);
  const copy = navbarCopy[language];

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-4">
        {primaryItems.map((item, index) => (
          <ProductCard
            key={item.title}
            item={item}
            index={index}
            isRtl={isRtl}
            openLabel={copy.openProduct}
          />
        ))}
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
          {copy.moreTools}
        </p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          {toolItems.map((item, index) => (
            <MenuLink key={item.title} item={item} colorIndex={index} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  item,
  index,
  isRtl,
  openLabel,
}: {
  item: MenuItem;
  index: number;
  isRtl: boolean;
  openLabel: string;
}) {
  const Icon = item.icon;
  const imageObjectPosition = item.previewPosition ?? "center top";

  return (
    <Link
      href={item.href}
      className="group relative flex min-h-[292px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-[0_16px_38px_-22px_rgba(15,23,42,0.46),0_4px_14px_-8px_rgba(15,23,42,0.16)] outline-none transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_26px_55px_-24px_rgba(79,70,229,0.42),0_12px_24px_-16px_rgba(15,23,42,0.24)] focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent} opacity-75 transition duration-300 group-hover:opacity-95`}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/95 text-violet-600 shadow-[0_12px_24px_-16px_rgba(79,70,229,0.55)]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-white/80 bg-white/85 text-[11px] font-black text-slate-500 shadow-sm">
          0{index + 1}
        </span>
      </div>
      <div className="relative z-10 mt-4 min-h-[76px]">
        <h3 className="text-[17px] font-extrabold tracking-normal text-[#10152f]">{item.title}</h3>
        <p className="mt-1.5 max-w-[24rem] text-[13px] font-medium leading-5 text-slate-600">{item.description}</p>
      </div>
      {item.preview && (
        <span className="relative z-10 mt-auto block h-[118px] overflow-hidden rounded-md border border-white/90 bg-slate-950 shadow-[0_18px_34px_-20px_rgba(15,23,42,0.65)] ring-1 ring-slate-900/5">
          <Image
            src={item.preview}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            style={{ objectPosition: imageObjectPosition }}
          />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/18 to-transparent" />
        </span>
      )}
      <span className="relative z-10 mt-3 flex items-center justify-between border-t border-white/80 pt-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {openLabel}
        <ArrowRight
          className={`h-4 w-4 text-violet-500 transition ${
            isRtl ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
          }`}
        />
      </span>
    </Link>
  );
}

function SolutionsPanel({ language }: { language: "en" | "fa" }) {
  const items = localizeMenuItems(solutionItems, language);
  const copy = navbarCopy[language];

  return (
    <div className="p-5">
      <div className="mb-3 border-b border-slate-100 px-3 pb-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600">
          {copy.byGoal}
        </p>
        <h2 className="mt-1 text-xl font-black text-[#10152f]">
          {copy.chooseGoal}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-x-7 gap-y-2">
        {items.map((item, index) => (
          <MenuLink key={item.title} item={item} colorIndex={index} />
        ))}
      </div>
    </div>
  );
}

function ResourcesPanel({ language }: { language: "en" | "fa" }) {
  const items = localizeMenuItems(resourceItems, language);
  const copy = navbarCopy[language];

  return (
    <div className="p-5">
      <div className="mb-4 flex items-end justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600">
            {copy.resourcesEyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black text-[#10152f]">
            {copy.resourcesTitle}
          </h2>
        </div>
        <Link href="/contact" className="text-sm font-bold text-violet-600 hover:text-violet-800">
          {copy.contactHelp}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-7 gap-y-2">
        {items.map((item, index) => (
          <MenuLink key={item.title} item={item} colorIndex={index} />
        ))}
      </div>
    </div>
  );
}

const iconColors = [
  "bg-violet-100 text-violet-600",
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-pink-100 text-pink-600",
  "bg-cyan-100 text-cyan-600",
];

function MenuLink({
  item,
  colorIndex = 0,
  compact = false,
}: {
  item: MenuItem;
  colorIndex?: number;
  compact?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex items-start gap-3 rounded-xl outline-none transition hover:bg-slate-50 focus-visible:bg-slate-50 ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <span className={`mt-0.5 flex shrink-0 items-center justify-center rounded-xl ${compact ? "h-9 w-9" : "h-11 w-11"} ${iconColors[colorIndex % iconColors.length]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-extrabold text-[#10152f] group-hover:text-violet-700">
          {item.title}
        </span>
        <span className={`mt-0.5 block text-slate-500 ${compact ? "text-xs leading-5" : "text-sm leading-5"}`}>
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function MobileSection({
  title,
  section,
  items,
  activeSection,
  onToggle,
}: {
  title: string;
  section: DesktopMenu;
  items: MenuItem[];
  activeSection: DesktopMenu | null;
  onToggle: (section: DesktopMenu | null) => void;
}) {
  const isOpen = activeSection === section;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold"
        onClick={() => onToggle(isOpen ? null : section)}
      >
        {title}
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="grid gap-1 border-t border-slate-100 p-2">
              {items.map((item, index) => (
                <MenuLink key={`${section}-${item.title}`} item={item} colorIndex={index} compact />
              ))}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanguagePill({
  language,
  onSelectLanguage,
}: {
  language: "en" | "fa";
  onSelectLanguage: (language: "en" | "fa") => void;
}) {
  const isPersian = language === "fa";
  const copy = navbarCopy[language];
  const flagSrc = isPersian
    ? "/images/flags/iran-flag.svg"
    : "/images/flags/usa-flag.svg";
  const label = isPersian ? "FA" : "EN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-[#070b22] shadow-sm transition hover:border-violet-200 hover:bg-violet-50"
        >
          <span className="relative h-5 w-7 overflow-hidden rounded-sm">
            <Image src={flagSrc} alt="" fill sizes="28px" className="object-cover" />
          </span>
          {label} <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36 rounded-2xl border-slate-200 bg-white p-2 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
      >
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-violet-50"
          onClick={() => onSelectLanguage("en")}
        >
          <span className="relative h-4 w-6 overflow-hidden rounded-sm">
            <Image src="/images/flags/usa-flag.svg" alt="" fill sizes="24px" className="object-cover" />
          </span>
          {copy.english}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-violet-50"
          onClick={() => onSelectLanguage("fa")}
        >
          <span className="relative h-4 w-6 overflow-hidden rounded-sm">
            <Image src="/images/flags/iran-flag.svg" alt="" fill sizes="24px" className="object-cover" />
          </span>
          {copy.persian}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
