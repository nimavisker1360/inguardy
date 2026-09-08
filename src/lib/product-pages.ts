export type ProductPage = {
  slug: string;
  title: string;
  titleFa: string;
  eyebrow: string;
  image: string;
  imageAlt: string;
  dashboardHref: string;
  summary: {
    en: string;
    fa: string;
  };
  sections: {
    titleEn: string;
    bodyEn: string;
    titleFa: string;
    bodyFa: string;
  }[];
  highlights: {
    en: string;
    fa: string;
  }[];
};

export const productPages: ProductPage[] = [
  {
    slug: "trading-journal",
    title: "Trading Journal",
    titleFa: "ژورنال معاملاتی",
    eyebrow: "Core product",
    image: "/images/001.png",
    imageAlt: "Trading journal product preview",
    dashboardHref: "/journal",
    summary: {
      en: "A structured workspace for logging trades, screenshots, notes, emotions, mistakes, and strategy context in one place.",
      fa: "یک فضای منظم برای ثبت معاملات، اسکرین‌شات‌ها، یادداشت‌ها، احساسات، اشتباهات و زمینه استراتژی در یک جا.",
    },
    sections: [
      {
        titleEn: "Complete trade context",
        bodyEn: "Keep entry, exit, symbol, direction, account, screenshots, setup notes, and review details connected to the same trade record.",
        titleFa: "زمینه کامل معامله",
        bodyFa: "ورود، خروج، نماد، جهت معامله، حساب، اسکرین‌شات‌ها، یادداشت ستاپ و جزئیات بررسی را در یک رکورد واحد نگه دارید.",
      },
      {
        titleEn: "Built for review",
        bodyEn: "Each trade becomes easier to revisit after the session, so you can see what you planned, what happened, and what should improve next.",
        titleFa: "ساخته‌شده برای بازبینی",
        bodyFa: "بعد از پایان سشن، مرور هر معامله ساده‌تر می‌شود تا ببینید چه برنامه‌ای داشتید، چه اتفاقی افتاد و دفعه بعد چه چیزی باید بهتر شود.",
      },
    ],
    highlights: [
      {
        en: "Manual and MT5-imported trade records",
        fa: "ثبت معاملات دستی و معاملات واردشده از MT5",
      },
      {
        en: "Screenshots, notes, psychology, and mistakes",
        fa: "اسکرین‌شات، یادداشت، روانشناسی و اشتباهات",
      },
      {
        en: "Clean history for every trading session",
        fa: "تاریخچه مرتب برای هر سشن معاملاتی",
      },
    ],
  },
  {
    slug: "analytics-reports",
    title: "Analytics & Reports",
    titleFa: "تحلیل‌ها و گزارش‌ها",
    eyebrow: "Performance intelligence",
    image: "/images/004.png",
    imageAlt: "Analytics and reports product preview",
    dashboardHref: "/journal/analytics",
    summary: {
      en: "Turn journal data into readable performance patterns, reports, filters, and practical insights for better decision making.",
      fa: "داده‌های ژورنال را به الگوهای قابل‌فهم عملکرد، گزارش‌ها، فیلترها و بینش‌های کاربردی برای تصمیم‌گیری بهتر تبدیل کنید.",
    },
    sections: [
      {
        titleEn: "See your performance clearly",
        bodyEn: "Review win rate, net PnL, profit factor, drawdown, symbols, sessions, strategies, and repeated behavior patterns.",
        titleFa: "عملکرد خود را شفاف ببینید",
        bodyFa: "نرخ برد، سود و زیان خالص، فاکتور سود، افت سرمایه، نمادها، سشن‌ها، استراتژی‌ها و الگوهای رفتاری تکراری را بررسی کنید.",
      },
      {
        titleEn: "Create useful reports",
        bodyEn: "Use reports for monthly reviews, funded account tracking, strategy evaluation, and a cleaner record of your trading progress.",
        titleFa: "گزارش‌های کاربردی بسازید",
        bodyFa: "از گزارش‌ها برای مرور ماهانه، پیگیری حساب پراپ، ارزیابی استراتژی و نگهداری سابقه شفاف پیشرفت معاملاتی استفاده کنید.",
      },
    ],
    highlights: [
      {
        en: "Advanced filters for symbols, sessions, and strategies",
        fa: "فیلترهای پیشرفته برای نمادها، سشن‌ها و استراتژی‌ها",
      },
      {
        en: "Readable metrics and export-ready reports",
        fa: "متریک‌های خوانا و گزارش‌های آماده خروجی",
      },
      {
        en: "Behavior and mistake pattern discovery",
        fa: "کشف الگوهای رفتاری و اشتباهات تکراری",
      },
    ],
  },
  {
    slug: "ai-trade-review",
    title: "AI Trade Review",
    titleFa: "بررسی معامله با هوش مصنوعی",
    eyebrow: "Structured feedback",
    image: "/images/002.png",
    imageAlt: "AI trade review product preview",
    dashboardHref: "/journal",
    summary: {
      en: "Review execution, risk, psychology, discipline, and setup quality with structured AI feedback after a trade is closed.",
      fa: "بعد از بسته‌شدن معامله، اجرا، ریسک، روانشناسی، انضباط و کیفیت ستاپ را با بازخورد ساختاریافته هوش مصنوعی بررسی کنید.",
    },
    sections: [
      {
        titleEn: "Practical post-trade feedback",
        bodyEn: "AI review helps organize what went well, what went wrong, and what should be changed before the next setup.",
        titleFa: "بازخورد کاربردی بعد از معامله",
        bodyFa: "بررسی AI کمک می‌کند نقاط مثبت، خطاها و تغییرات لازم برای ستاپ بعدی را مرتب و قابل اجرا ببینید.",
      },
      {
        titleEn: "Psychology and discipline",
        bodyEn: "Connect emotions, plan following, entry reason, exit quality, and repeated mistakes to the trade outcome.",
        titleFa: "روانشناسی و انضباط",
        bodyFa: "احساسات، پایبندی به پلن، دلیل ورود، کیفیت خروج و اشتباهات تکراری را به نتیجه معامله وصل کنید.",
      },
    ],
    highlights: [
      {
        en: "Setup, risk, execution, and psychology review",
        fa: "بررسی ستاپ، ریسک، اجرا و روانشناسی",
      },
      {
        en: "Actionable lessons for the next trade",
        fa: "درس‌های قابل اجرا برای معامله بعدی",
      },
      {
        en: "Better discipline through repeated review",
        fa: "انضباط بهتر با مرور مداوم",
      },
    ],
  },
  {
    slug: "mt5-auto-sync",
    title: "MT5 Auto Sync",
    titleFa: "همگام‌سازی خودکار MT5",
    eyebrow: "Automation",
    image: "/images/background/AuTrade.png",
    imageAlt: "MT5 auto sync product preview",
    dashboardHref: "/dashboard/accounts",
    summary: {
      en: "Connect MetaTrader 5 and automate trade logging so your journal stays updated with less manual work.",
      fa: "متاتریدر ۵ را متصل کنید و ثبت معاملات را خودکار کنید تا ژورنال شما با کار دستی کمتر به‌روز بماند.",
    },
    sections: [
      {
        titleEn: "Less manual entry",
        bodyEn: "MT5 sync reduces the time spent copying trade details and keeps account activity connected to the journal.",
        titleFa: "ورود دستی کمتر",
        bodyFa: "همگام‌سازی MT5 زمان کپی‌کردن جزئیات معامله را کم می‌کند و فعالیت حساب را به ژورنال وصل نگه می‌دارد.",
      },
      {
        titleEn: "Cleaner trade history",
        bodyEn: "Imported records make it easier to review closed trades, daily activity, and performance without losing context.",
        titleFa: "تاریخچه معاملاتی مرتب‌تر",
        bodyFa: "رکوردهای واردشده مرور معاملات بسته‌شده، فعالیت روزانه و عملکرد را بدون از دست رفتن زمینه ساده‌تر می‌کنند.",
      },
    ],
    highlights: [
      {
        en: "Automatic trade import from MetaTrader 5",
        fa: "ورود خودکار معاملات از MetaTrader 5",
      },
      {
        en: "Account-level journal connection",
        fa: "اتصال ژورنال در سطح حساب",
      },
      {
        en: "Fewer missed trades in your records",
        fa: "کاهش معاملات جامانده در سابقه شما",
      },
    ],
  },
  {
    slug: "playbooks",
    title: "Playbooks",
    titleFa: "پلی‌بوک‌ها",
    eyebrow: "Strategy rules",
    image: "/images/background/checklist.png",
    imageAlt: "Playbooks product preview",
    dashboardHref: "/journal/playbooks",
    summary: {
      en: "Build and track the rules behind each strategy so every setup has a clear process before execution.",
      fa: "قوانین پشت هر استراتژی را بسازید و پیگیری کنید تا هر ستاپ قبل از اجرا یک فرایند مشخص داشته باشد.",
    },
    sections: [
      {
        titleEn: "Define your edge",
        bodyEn: "Document entry conditions, invalidation rules, management notes, and review criteria for each trading strategy.",
        titleFa: "مزیت معاملاتی خود را تعریف کنید",
        bodyFa: "شرایط ورود، قوانین بی‌اعتبار شدن، نکات مدیریت معامله و معیارهای بررسی هر استراتژی را ثبت کنید.",
      },
      {
        titleEn: "Connect rules to outcomes",
        bodyEn: "When trades are linked to playbooks, performance analysis becomes more specific and easier to improve.",
        titleFa: "قوانین را به نتیجه وصل کنید",
        bodyFa: "وقتی معاملات به پلی‌بوک وصل شوند، تحلیل عملکرد دقیق‌تر و بهبود آن ساده‌تر می‌شود.",
      },
    ],
    highlights: [
      {
        en: "Strategy rules and setup definitions",
        fa: "قوانین استراتژی و تعریف ستاپ‌ها",
      },
      {
        en: "Compliance tracking for your process",
        fa: "پیگیری میزان پایبندی به فرایند",
      },
      {
        en: "Better review of which setups work",
        fa: "مرور بهتر ستاپ‌های موفق و ضعیف",
      },
    ],
  },
  {
    slug: "checklists",
    title: "Checklists",
    titleFa: "چک‌لیست‌ها",
    eyebrow: "Process protection",
    image: "/images/background/checklist.png",
    imageAlt: "Checklists product preview",
    dashboardHref: "/journal/checklists",
    summary: {
      en: "Protect your process before and after every trade with repeatable checks for risk, setup quality, and discipline.",
      fa: "با چک‌های تکرارپذیر برای ریسک، کیفیت ستاپ و انضباط، فرایند خود را قبل و بعد از هر معامله محافظت کنید.",
    },
    sections: [
      {
        titleEn: "Trade with fewer skipped rules",
        bodyEn: "Use checklist items to confirm the conditions that matter before entering and while reviewing the trade.",
        titleFa: "با قوانین جاافتاده کمتر معامله کنید",
        bodyFa: "با آیتم‌های چک‌لیست، شرایط مهم قبل از ورود و هنگام بررسی معامله را تایید کنید.",
      },
      {
        titleEn: "Turn discipline into data",
        bodyEn: "Checklist completion can be reviewed beside trade results, making process quality easier to measure.",
        titleFa: "انضباط را به داده تبدیل کنید",
        bodyFa: "تکمیل چک‌لیست کنار نتیجه معامله دیده می‌شود و اندازه‌گیری کیفیت فرایند را ساده‌تر می‌کند.",
      },
    ],
    highlights: [
      {
        en: "Pre-trade and post-trade checks",
        fa: "چک‌های قبل و بعد از معامله",
      },
      {
        en: "Risk and setup confirmation",
        fa: "تایید ریسک و کیفیت ستاپ",
      },
      {
        en: "Review discipline over time",
        fa: "مرور انضباط در طول زمان",
      },
    ],
  },
  {
    slug: "trade-calendar",
    title: "Trade Calendar",
    titleFa: "تقویم معاملاتی",
    eyebrow: "Daily overview",
    image: "/images/background/daily_journal.png",
    imageAlt: "Trade calendar product preview",
    dashboardHref: "/journal/calendar",
    summary: {
      en: "See daily PnL, trading activity, journal status, and behavior patterns across the month at a glance.",
      fa: "سود و زیان روزانه، فعالیت معاملاتی، وضعیت ژورنال و الگوهای رفتاری ماهانه را در یک نگاه ببینید.",
    },
    sections: [
      {
        titleEn: "Understand your month",
        bodyEn: "Calendar view helps you see active days, quiet days, profitable periods, weak periods, and review consistency.",
        titleFa: "ماه معاملاتی خود را بهتر بفهمید",
        bodyFa: "نمای تقویم روزهای فعال، روزهای کم‌معامله، دوره‌های سودده، دوره‌های ضعیف و نظم در مرور را نشان می‌دهد.",
      },
      {
        titleEn: "Spot daily behavior",
        bodyEn: "Daily grouping makes it easier to connect performance with routine, session quality, and overtrading risk.",
        titleFa: "رفتار روزانه را تشخیص دهید",
        bodyFa: "گروه‌بندی روزانه کمک می‌کند عملکرد را به روتین، کیفیت سشن و ریسک اورتریدینگ وصل کنید.",
      },
    ],
    highlights: [
      {
        en: "Daily PnL and trade count",
        fa: "سود و زیان روزانه و تعداد معاملات",
      },
      {
        en: "Monthly activity patterns",
        fa: "الگوهای فعالیت ماهانه",
      },
      {
        en: "Journal and review visibility",
        fa: "نمایش وضعیت ژورنال و بازبینی",
      },
    ],
  },
  {
    slug: "prop-firm-tracker",
    title: "Prop Firm Tracker",
    titleFa: "پیگیری حساب پراپ",
    eyebrow: "Challenge tracking",
    image: "/images/background/prop_firm.png",
    imageAlt: "Prop firm tracker product preview",
    dashboardHref: "/dashboard/prop-firms",
    summary: {
      en: "Monitor profit targets, drawdown, challenge progress, and account rules so funded-account trading stays controlled.",
      fa: "تارگت سود، افت سرمایه، پیشرفت چالش و قوانین حساب را پیگیری کنید تا معامله‌گری در حساب پراپ کنترل‌شده‌تر بماند.",
    },
    sections: [
      {
        titleEn: "Keep rules visible",
        bodyEn: "Track challenge limits and progress beside your trading activity instead of keeping rules in a separate note.",
        titleFa: "قوانین را جلوی چشم نگه دارید",
        bodyFa: "محدودیت‌ها و پیشرفت چالش را کنار فعالیت معاملاتی ببینید، نه در یک یادداشت جداگانه.",
      },
      {
        titleEn: "Protect the account",
        bodyEn: "By watching targets and drawdown together, you can keep risk decisions aligned with the prop firm objective.",
        titleFa: "از حساب محافظت کنید",
        bodyFa: "با دیدن هم‌زمان تارگت‌ها و افت سرمایه، تصمیم‌های ریسکی را با هدف حساب پراپ هماهنگ نگه دارید.",
      },
    ],
    highlights: [
      {
        en: "Profit target and drawdown monitoring",
        fa: "پایش تارگت سود و افت سرمایه",
      },
      {
        en: "Challenge progress visibility",
        fa: "نمایش پیشرفت چالش",
      },
      {
        en: "Rules connected to trading activity",
        fa: "اتصال قوانین به فعالیت معاملاتی",
      },
    ],
  },
  {
    slug: "trading-signals",
    title: "Trading Signals",
    titleFa: "سیگنال‌های معاملاتی",
    eyebrow: "Signal desk",
    image: "/images/background/signal.png",
    imageAlt: "Trading signals product preview",
    dashboardHref: "/signals",
    summary: {
      en: "Browse structured forex and gold trade ideas with direction, entry, stop loss, take profit, status, and result tracking.",
      fa: "ایده‌های معاملاتی ساختاریافته فارکس و طلا را با جهت، ورود، حد ضرر، تارگت، وضعیت و نتیجه دنبال کنید.",
    },
    sections: [
      {
        titleEn: "Clear signal structure",
        bodyEn: "Each signal is easier to scan because the plan is separated into direction, entry, stop loss, targets, and current status.",
        titleFa: "ساختار شفاف سیگنال",
        bodyFa: "هر سیگنال سریع‌تر قابل بررسی است چون پلن معامله به جهت، ورود، حد ضرر، تارگت‌ها و وضعیت فعلی تقسیم شده است.",
      },
      {
        titleEn: "Review the result",
        bodyEn: "Signal history helps traders review ideas after closing instead of only reacting to the next alert.",
        titleFa: "نتیجه را مرور کنید",
        bodyFa: "تاریخچه سیگنال کمک می‌کند بعد از بسته‌شدن، ایده‌ها را مرور کنید و فقط دنبال هشدار بعدی نباشید.",
      },
    ],
    highlights: [
      {
        en: "Forex and gold trade ideas",
        fa: "ایده‌های معاملاتی فارکس و طلا",
      },
      {
        en: "Entry, stop loss, and take profit details",
        fa: "جزئیات ورود، حد ضرر و حد سود",
      },
      {
        en: "Signal status and result tracking",
        fa: "پیگیری وضعیت و نتیجه سیگنال",
      },
    ],
  },
];

export function getProductPage(slug: string) {
  return productPages.find((product) => product.slug === slug) ?? null;
}
