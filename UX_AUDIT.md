# Tradivix UX and Usability Audit

Audit date: 2026-07-20

Audit mode: static review continued with visual runtime inspection.

Runtime scope:

- Ran the app locally with the existing installed dependencies.
- Used the existing signed-in test account and existing test data.
- Built a local production bundle with `npx next build` because `next dev` repeatedly stopped after route compilation and `next start` needed a production build.
- Used temporary local `next start` runs for screenshot capture, plus the existing local PM2 app on port `3002`.
- Did not modify application source code, database schema, APIs, authentication, payments, MT5 integration, or production data.
- Did not submit manual trade creation, payment requests, destructive actions, or AI generation calls.
- Connection-key screenshots from the Accounts page were not retained as evidence because the UI exposes MT5 connection material on screen.

Screenshot evidence:

- General runtime screenshots: `audit-screenshots/runtime-2026-07-20-3013/`
- Manual trade interaction: `audit-screenshots/runtime-2026-07-20-3014/`
- Trade detail review and AI sections: `audit-screenshots/runtime-2026-07-20-3016/`
- Account screenshots were deleted/redacted because the rendered page displayed connection key material.

## Executive Summary

The runtime inspection confirms the product has a broad, real trading-journal workflow: dashboard, MT5 accounts, manual journal entry, trade list, trade detail, psychology review, checklist attachment, AI trade review affordance, daily journal, calendar, playbooks, checklists, analytics, reports, market radar, premium renewal, and settings are all reachable with test data.

The main UX problem is not missing features. The main problem is operational overload. A new user sees the full product surface, a right sidebar, a horizontal workflow strip, a subscription banner, tutorial overlays, dashboard actions, and page-specific tools all at once. On desktop this is dense but workable. On mobile it becomes noisy and sometimes clipped.

The strongest runtime findings are:

- The dashboard has a visible next-action area and real account/trade data, so the static concern about "no primary action" is less severe for a populated account.
- MT5 status is visible, but the Accounts page exposes raw technical settings and connection material too prominently.
- Manual trade entry exists and opens inline, but the first-run tutorial can obscure the form immediately after the user opens it.
- Trade detail is the strongest workflow surface, with psychology review, checklist attachment, AI review readiness, screenshots, and tags in one place.
- Mobile navigation is confirmed as a major problem at 390px and 430px.
- Market Radar desktop rendered a large blank TradingView area during local runtime inspection.

## Final UX Score

Final UX score: 5.8 / 10

- First dashboard visit: 6.5 / 10
- Navigation clarity: 4 / 10
- MT5 connection and sync clarity: 4 / 10
- Manual trade workflow: 6 / 10
- Trade detail and review workflow: 7 / 10
- AI trade review affordance: 6 / 10
- Daily journal: 6.5 / 10
- Calendar: 4.5 / 10
- Playbooks and checklists: 6.5 / 10
- Analytics and reports: 5.5 / 10
- Market Radar: 4.5 / 10
- Subscription and locked-state clarity: 5.5 / 10
- Settings: 5 / 10
- Mobile usability: 3.5 / 10

This is higher than the static-only score because the populated dashboard and trade detail workflow are more usable than expected. It remains below 6 because mobile layout, navigation overload, tutorial interference, MT5 secret exposure, and Market Radar rendering issues are material.

## Visual Findings By Workflow

### 1. First Dashboard Visit

What the user sees first: right sidebar navigation, top controls, workflow strip, subscription banner, dashboard title, today's readiness card, and action center.

Primary action: "Record today's readiness" and "Open daily journal" are the clearest actions. The action center also points to reviewing trades and managing open trades.

Confusion risk: too many navigation systems compete: sidebar, workflow strip, top controls, subscription banner, and dashboard cards. On mobile the app header is clipped and horizontally scrollable.

Result visibility: dashboard status cards clearly show readiness, open trades, pending review count, PnL, and win rate.

States observed: populated data, warning/action cards, subscription renewal banner. No empty dashboard state was observed because the test account already contains data.

Evidence: `dashboard-1440.png`, `dashboard-390.png`.

### 2. Connect Or Inspect An MT5 Account

What the user sees first: account list, quick MT5 connect panel, account cards, MT5 journal connection status, last connected/sync timestamps, and EA settings helper.

Primary action: "Create MT5 key" for quick connect, or "Regenerate Secret" / "Disable Journal Sync" on an existing account.

Confusion risk: user-facing copy mixes English technical terms with Persian UI, including `JOURNAL_API_BASE_URL`, `JOURNAL_UPLOAD_SECRET`, `journalEnabled`, and debug settings. Several accounts with the same account number appear, making it hard to know which is canonical.

Result visibility: status says "Connected", with last connected and last sync timestamps.

States observed: connected state, raw sync flags, key regeneration controls, disable sync controls.

Important confirmed problem: the rendered Accounts page exposes connection-key material in the UI. This is both a UX safety issue and a secret-handling risk. Screenshot evidence was not retained in the report for this page.

### 3. Understand MT5 Connection And Sync Status

What the user sees first: "MT5 Journal Connection", account number, broker/platform, "Connected", last connected, and last sync.

Primary action: regenerate key, disable sync, copy API URL, copy secret.

Confusion risk: the UI confirms connected/not connected, but does not explain whether the EA is actively syncing, waiting for the next event, paused, failed, blocked by plan, or safe to rotate. "Disable Journal Sync" and "Regenerate Secret" are high-impact actions shown as normal buttons.

Result visibility: last sync is visible, but sync history and failure recovery are not.

States observed: connected, enabled, last sync. Waiting, failed, paused, and locked MT5 states were not observed in this account.

### 4. Add A Manual Trade

What the user sees first: on `/journal`, the "New trade" button appears above summary cards and filters.

Primary action: open the inline manual trade form.

Confusion risk: after opening the form on first-run state, the tutorial overlay appears over the form. The user can see that something happened, but the form is dimmed and partially blocked. This makes the first manual trade action feel interrupted.

Result visibility: the inline form appears with symbol, side, prices, SL/TP, lot size, risk, PnL, entry/exit time, status, setup, emotion, mistakes, notes, cancel, and save controls.

States observed: open form state and tutorial overlay state. Save was not submitted to avoid mutating test data.

Evidence: `manual-trade-button-index5-after-1440.png`, `manual-trade-button-index5-after-390.png`.

### 5. Open The Trades List

What the user sees first: summary cards, filters, date-grouped trade table, PnL group headers, and many MT5-imported rows.

Primary action: filter or open a trade via the symbol/eye action.

Confusion risk: filters appear before the table and use a mix of English labels and Persian labels. Source options include Manual, MT5, EA Import, and MT5 EA, which appear overlapping.

Result visibility: trade rows show status, account, review status, compliance, entry, exit, PnL, and R:R.

Mobile problem: at 390px the user initially sees nav, banner, title, CTA, and summary cards; the actual trade list is far below and table/card adaptation is not immediate.

Evidence: `journal-trades-1440.png`, `journal-trades-390.png`.

### 6. Open A Trade Detail

What the user sees first: back link, symbol, side/status badges, account/broker/platform, edit/delete controls, and a grid of trade facts.

Primary action: edit the trade or scroll to complete review/checklist/AI review.

Confusion risk: desktop is strong, but mobile requires a long scroll before review sections. Mixed English/Persian labels appear in dates and technical fields.

Result visibility: the trade detail page clearly shows the selected trade and its data.

Evidence: `trade-detail-existing-1440.png`, `trade-detail-existing-390.png`, `trade-detail-top-no-tour-1440.png`.

### 7. Add Review Information

What the user sees first: psychology review form with discipline slider, plan-following select, before/after emotions, mistake type, entry reason, psychology notes, and lesson learned.

Primary action: "Save review".

Confusion risk: for MT5-imported trades, the form is populated with "Imported from MT5 EA" while still asking subjective review questions. This is useful, but it needs a stronger prompt that the user should replace imported placeholders with their own review.

Result visibility: the form and save button are visible. Save was not submitted to avoid changing test data.

Evidence: `trade-detail-review-ai-no-tour-1440.png`.

### 8. Start AI Trade Review

What the user sees first: "AI trade review" card, generate button, educational disclaimer, and readiness chips for setup, emotion, mistake, notes, plan review, and screenshots.

Primary action: generate AI review.

Confusion risk: readiness chips are helpful, but several chips are compact and mixed-language. The UI does not strongly separate "missing recommended context" from "blocked from generating".

Result visibility: not executed. The launch affordance and pre-generation state were inspected visually, but generation was not started because it may call an external AI provider and write generated review data back to the trade.

Evidence: `trade-detail-ai-card-1440.png`.

### 9. Open Daily Journal

What the user sees first: date selector, account selector, previous/today/next controls, and save CTA.

Primary action: save the daily journal.

Confusion risk: the primary form is understandable, but the mobile viewport spends a lot of space on global nav before daily journal controls.

Result visibility: page state and date are visible. Save was not submitted.

Evidence: `daily-journal-1440.png`, `daily-journal-390.png`.

### 10. Open Calendar

What the user sees first: month controls, active trading days count, account selector, and a month grid.

Primary action: select a day or apply account filters.

Confusion risk: the calendar uses dense day cells with PnL, trade count, win rate, journal state, checklist score, and overtrading tags.

Mobile problem: confirmed. The seven-column grid is cramped at 390px and content is clipped horizontally. A mobile agenda/list view is needed.

Evidence: `calendar-1440.png`, `calendar-390.png`.

### 11. Open Playbooks And Checklists

What the user sees first: create CTA, search/filter controls, and existing templates/cards.

Primary action: create a playbook/checklist or open existing one.

Confusion risk: playbooks are fairly clear, but delete/edit/view icon buttons sit close together. Delete appears as an icon-only destructive action next to normal actions.

Result visibility: existing playbook/checklist cards show active/default tags and performance metadata.

Evidence: `playbooks-1440.png`, `checklists-390.png`.

### 12. Open Analytics And Reports

What the user sees first: analytics hero/stats and filters; reports show export actions, filters, stats, executive summary, and report files.

Primary action: apply filters, read insights, print/PDF, or generate report.

Confusion risk: tutorial overlays open on top of filters and controls, especially on Analytics and Reports. This educates but also blocks the actual task. Reports expose many filters at once before users have chosen a reporting goal.

Mobile problem: confirmed. Reports and analytics start with stacked nav/banner/tutorial/filter content before the result content.

Evidence: `analytics-1440.png`, `reports-390.png`.

### 13. Open Market Radar

What the user sees first: "AI Chart Copilot", symbol selector, timeframe controls, chart mode tabs, AI analysis panel, and educational warning.

Primary action: select symbol/timeframe and run a market analysis mode.

Confusion risk: the page is called Market Radar in routing/sidebar context but the visible headline says "AI Chart Copilot". This confirms the naming mismatch.

Runtime problem: on desktop, the TradingView area rendered as a large blank white rectangle during inspection. On mobile, the chart header appears, but the chart itself is pushed lower and partially cramped.

Evidence: `market-radar-1440.png`, `market-radar-390.png`.

### 14. Inspect Subscription-Locked States

What the user sees first: this test account is on Pro Monthly with 21 days remaining, so locked states were mostly not reachable.

Primary action: renew subscription from the banner or open premium payment form.

Confusion risk: the premium page explains manual USDT payment and admin confirmation, but the dashboard banner only says the plan and days remaining. It does not explain what will be lost after expiry.

Result visibility: premium page shows plan selection, network selection, amount, duration, and payment request CTA.

Confirmed limitation: true locked feature states could not be fully inspected with this Pro test account.

Evidence: `premium.txt`, `latest-signals.txt`.

### 15. Inspect Settings

What the user sees first: profile image, upload, name, last name, email, reset, and save changes.

Primary action: update profile.

Confusion risk: Settings feels profile-only. Security, password, sessions, subscription, connected accounts, MT5 keys, language, data export, and account deletion are not visible as a unified account settings area.

Result visibility: fields and save/reset controls are visible. Save was not submitted.

Evidence: `settings-1440.png`, `settings-390.png`.

## Confirmed Problems

1. Mobile navigation is overloaded and clipped.

At 390px and 430px, the top/sidebar navigation becomes multiple horizontal layers. The page title area can be clipped, and users must scroll past nav, language/theme controls, workflow strip, and subscription banner before the actual task.

2. Tutorial overlays interrupt real workflows.

The tutorial can appear after opening manual trade, analytics, and reports. It blocks controls and dims the interface. It is educational, but it competes with the action the user just initiated.

3. MT5 connection material is exposed too directly.

The Accounts page shows raw EA configuration concepts and connection material. Even with copy buttons, this should be masked by default, revealed only intentionally, and separated from sync status.

4. MT5 status is too coarse.

"Connected" and timestamps are visible, but there is no clear user-facing state machine for waiting, syncing, synced, failed, paused, or locked.

5. Market Radar chart can render blank.

The desktop runtime inspection showed a large blank TradingView area. The page depends on this visual asset, so blank chart states need loading, failure, retry, and fallback treatment.

6. Calendar mobile layout is not usable enough.

The month grid is too dense at 390px and clips horizontally. The information is valuable, but it needs a mobile agenda mode.

7. Reports and analytics start too heavy.

Both pages expose many filters and tutorial content before users can settle on a task. Reports especially need progressive disclosure.

8. Trade list remains table-first.

Desktop table is dense but useful. On mobile the user must work through stacked chrome and summary cards before reaching rows; a mobile card/list pattern would be easier.

9. Naming remains inconsistent.

Market Radar, AI Reader, and AI Chart Copilot still appear as overlapping concepts.

10. Destructive actions are too close to routine actions.

Delete icons on playbook/trade surfaces appear near edit/view controls and need stronger confirmation and spacing.

## Static Findings That Were Incorrect Or Overstated

- The dashboard does have a visible next-action area for a populated account. The static concern that no primary action exists is less severe in runtime.
- Manual trade entry is not hidden or missing. It is directly available on `/journal`, opens inline, and contains the expected fields.
- Trade detail is stronger than static review could prove. Runtime confirmed a cohesive review surface with psychology, checklists, AI review readiness, screenshots, and tags.
- Subscription-locked state coverage could not be fully judged because the existing test account has an active Pro Monthly subscription.
- The "first dashboard visit" empty-state concern could not be verified with this account because it already contains accounts, trades, and subscription data.

## Before/After Recommendations

Before: mobile shows sidebar items, logout, theme/language controls, workflow strip, subscription banner, and page content in a tall stack.

After: use a compact mobile top bar plus bottom nav: Dashboard, Trades, Add, Insights, Account. Move the full menu into a drawer.

Before: tutorial opens automatically and blocks the task the user just tried.

After: show tutorial as a dismissible inline helper or small guided checklist; never obscure an active form after the user clicks a primary CTA.

Before: MT5 page exposes raw config fields and secret-like material in the main account card.

After: show "Connected / Syncing / Last event" first. Put API URL and connection key behind "Reveal connection key" with a warning and copy-only masked field.

Before: Market Radar relies on a chart area that can appear blank.

After: add explicit chart loading, failed-to-load, retry, and "switch to Smart AI Chart" fallback states.

Before: reports expose all filters at once.

After: ask for report intent first: monthly review, funded account summary, mistake review, playbook report, or export raw trades. Then reveal relevant filters.

Before: calendar uses the same month grid on mobile.

After: default mobile calendar to agenda cards grouped by day, with month grid as an optional view.

Before: trade detail review and AI sections are far below the trade facts on mobile.

After: add a sticky mobile section switcher: Summary, Review, Checklist, AI, Screenshots.

Before: destructive icon buttons sit next to routine actions.

After: move destructive actions to an overflow menu and use explicit confirmation modals naming what will be deleted.

## Five Highest-Impact Improvements

1. Redesign mobile navigation around a bottom nav plus drawer.

2. Mask and isolate MT5 connection keys and replace raw sync flags with a user-facing MT5 state machine.

3. Replace automatic tutorial overlays with inline onboarding that never blocks active forms.

4. Add mobile-first views for trades, calendar, analytics filters, and reports filters.

5. Fix Market Radar chart rendering and unify naming across Market Radar, AI Reader, and AI Chart Copilot.

## Residual Risk

- AI trade generation was not executed because it may call an external AI provider and write generated output to the test trade.
- Manual trade save, psychology save, settings save, payment request creation, MT5 key regeneration, sync disabling, and delete actions were not submitted.
- Locked states were only partially inspected because the available test account is currently Pro Monthly.
