# راهنمای نصب Trade Journal Recorder در MT5

این Expert Advisor فقط معاملات شما را برای ژورنال سایت ثبت می‌کند. هیچ معامله‌ای باز نمی‌کند، هیچ معامله‌ای را نمی‌بندد و مقدارهای SL یا TP را تغییر نمی‌دهد.

## پیش‌نیازها

1. در سایت وارد حساب کاربری خود شوید.
2. از بخش داشبورد، یک Trading Account بسازید یا از گزینه MT5 Quick Connect استفاده کنید.
3. برای حساب معاملاتی، یک `JOURNAL_UPLOAD_SECRET` بسازید. این کلید فقط یک بار نمایش داده می‌شود؛ همان لحظه آن را داخل تنظیمات EA وارد کنید.
4. آدرس سایت برای اتصال MT5 این مقدار است:

```text
https://tradivix.com
```

## نصب فایل EA

1. در MT5 از منوی `File` گزینه `Open Data Folder` را بزنید.
2. وارد مسیر زیر شوید:

```text
MQL5 > Experts
```

3. فایل `TradeJournalRecorder.mq5` را داخل این پوشه کپی کنید.
4. برنامه MetaEditor را باز کنید.
5. از داخل MetaEditor فایل `TradeJournalRecorder.mq5` را باز کنید.
6. دکمه `Compile` را بزنید.
7. اگر Compile بدون خطا انجام شد، به MT5 برگردید.
8. در پنجره Navigator، بخش `Expert Advisors` را Refresh کنید تا `TradeJournalRecorder` نمایش داده شود.

## فعال کردن WebRequest در MT5

1. در MT5 از منوی `Tools` وارد `Options` شوید.
2. تب `Expert Advisors` را باز کنید.
3. گزینه‌های زیر را فعال کنید:

```text
Allow algorithmic trading
Allow WebRequest for listed URL
```

4. آدرس زیر را دقیقاً به لیست URLهای مجاز اضافه کنید:

```text
https://tradivix.com
```

نکته: آدرس را با `/api/mt5/journal` وارد نکنید. فقط دامنه بالا کافی است.

## اتصال EA به چارت

1. در MT5 گزینه `Algo Trading` را روشن کنید.
2. EA را فقط روی یک چارت اجرا کنید. لازم نیست روی همه چارت‌ها نصب شود.
3. `TradeJournalRecorder` را از Navigator روی یک چارت بکشید.
4. در پنجره تنظیمات EA، تب `Inputs` را باز کنید.
5. مقدارها را به شکل زیر تنظیم کنید:

```text
JOURNAL_API_BASE_URL = https://tradivix.com
JOURNAL_UPLOAD_SECRET = کلید ساخته‌شده در سایت
JOURNAL_ENABLED = true
DEBUG_MODE = true
CAPTURE_SCREENSHOTS = true
OPEN_CHART_FOR_SCREENSHOT = true
CLOSE_TEMP_CHART_AFTER_SCREENSHOT = true
JOURNAL_SCREENSHOT_TIMEFRAME = PERIOD_M5
SCREENSHOT_WIDTH = 800
SCREENSHOT_HEIGHT = 450
SCREENSHOT_DELAY_MS = 1500
```

6. در تب `Common` مطمئن شوید اجازه اجرای Algo Trading برای EA فعال است.
7. روی `OK` بزنید.

## تست اتصال

1. بعد از نصب EA، تب `Experts` و `Journal` در MT5 را باز نگه دارید.
2. اگر نصب درست باشد، باید پیام شروع EA و آدرس API را ببینید.
3. یک معامله کوچک تستی باز کنید.
4. چند ثانیه صبر کنید.
5. در سایت صفحه ژورنال یا معاملات را بررسی کنید.
6. معامله را ببندید و دوباره سایت را چک کنید تا خروج معامله و نتیجه ثبت شده باشد.

## اسکرین‌شات معاملات

اگر `CAPTURE_SCREENSHOTS = true` باشد، EA هنگام ورود و خروج معامله از چارت عکس می‌گیرد و به سایت ارسال می‌کند.

اگر معامله روی نمادی باز شود که چارت آن باز نیست، با فعال بودن `OPEN_CHART_FOR_SCREENSHOT`، EA چارت آن نماد را موقتاً باز می‌کند. اگر `CLOSE_TEMP_CHART_AFTER_SCREENSHOT` فعال باشد، بعد از گرفتن عکس آن چارت را می‌بندد.

## خطاهای رایج

### خطای WebRequest یا کد 4014

یعنی آدرس سایت در لیست WebRequest مجاز نیست. مسیر زیر را دوباره بررسی کنید:

```text
Tools > Options > Expert Advisors > Allow WebRequest for listed URL
```

و این آدرس را اضافه کنید:

```text
https://tradivix.com
```

### خطای secret یا Unauthorized

یعنی مقدار `JOURNAL_UPLOAD_SECRET` اشتباه است، خالی است یا برای این حساب معتبر نیست. از داخل سایت برای همان Trading Account کلید جدید بسازید و داخل EA وارد کنید.

### معامله در سایت ثبت نمی‌شود

این موارد را بررسی کنید:

1. `JOURNAL_ENABLED` باید `true` باشد.
2. `JOURNAL_API_BASE_URL` باید دقیقاً `https://tradivix.com` باشد.
3. EA باید فقط روی یک چارت فعال باشد.
4. حساب کاربری سایت باید اجازه استفاده از ژورنال MT5 را داشته باشد.
5. تب `Experts` در MT5 را برای پیام خطا بررسی کنید.

### اسکرین‌شات ثبت نمی‌شود

این موارد را بررسی کنید:

1. `CAPTURE_SCREENSHOTS` باید `true` باشد.
2. چارت نماد باید قابل باز شدن باشد.
3. اتصال اینترنت و WebRequest باید فعال باشد.
4. اگر سایت روی Vercel اجرا می‌شود، ذخیره‌سازی Blob در سایت باید تنظیم شده باشد.

## نکات مهم

- این EA معامله باز یا بسته نمی‌کند.
- این EA مقدار SL و TP را تغییر نمی‌دهد.
- EA را فقط روی یک چارت نصب کنید.
- برای هر حساب معاملاتی، secret مخصوص همان حساب را استفاده کنید.
- اگر secret را عوض کردید، باید مقدار جدید را دوباره داخل تنظیمات EA وارد کنید.
- اگر فایل EA را آپدیت کردید، بعد از جایگزینی فایل در پوشه `Experts` دوباره Compile کنید.
