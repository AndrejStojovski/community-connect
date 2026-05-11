## Stage 2 Upgrade Plan — FoundIt Platform

This is a very large scope. To keep the app stable and avoid a "big-bang" regression, I'll split into 3 shippable stages. You approve, I ship Stage A first, then proceed.

### Stage A — Moderation, Bans, Notifications, Theme (this round)

**Database**
- `user_bans` table (user_id, type: temporary/permanent, reason, expires_at, banned_by, notes) with RLS (admin manage, user view own).
- `admin_audit_logs` table (actor_id, action, target_type, target_id, metadata).
- `report_views`, `report_bookmarks` tables.
- Trigger: block banned users from inserting reports/claims/messages via RLS (`NOT EXISTS active ban`).
- Hide reports of banned users from public SELECT policy.
- `is_banned(uuid)` security-definer helper.

**Backend logic**
- Edge function `admin-action` for ban/unban/warn with audit logging (service role).
- Auth check on login: if banned, sign out + show ban screen.

**UI**
- `/admin` redesign: tabs for Overview, Reports, Users, Moderation Queue (pending claims with disputes), Audit Log.
- Ban dialog with type/duration/reason.
- Banned-user landing screen.
- Light/Dark theme toggle in header (already have both palettes; persist to localStorage).
- Notification center dropdown in header (uses existing `notifications` table + realtime subscription, unread badge).
- Sticky glass header polish, mobile bottom nav.

### Stage B — Discovery, Profiles, Detail Page (next round)

- Homepage redesign: hero search, live stats counters, recently recovered carousel, trending categories, how-it-works, featured returns.
- Explore page with fuzzy search (Fuse.js), saved searches (localStorage), nearby radius, trending tags.
- Report detail redesign: image gallery + zoom, map preview, claim activity timeline, similar nearby reports, owner reputation summary, view counter, bookmark/share.
- Profile upgrade: cover banner, achievements, activity timeline, recovery streak.
- Leaderboard page (top reputation, monthly champions).

### Stage C — Analytics & Polish (final round)

- `/admin/analytics` with Recharts: lost vs found over time, claim approval rate, recovery %, category popularity, DAU/WAU, reputation distribution. Time range filter + CSV export.
- Geographic activity visualization.
- Skeleton loaders everywhere, optimistic UI on claims/bookmarks, error boundaries, image lazy-loading + blur-up.
- Trust indicators (confidence score on reports based on poster reputation + age + claim activity).

### Technical notes
- All new tables get RLS; admin actions go through audit logging trigger or edge function.
- `is_banned()` SECURITY DEFINER + `STABLE`, used in RLS for reports/claims/messages inserts and report SELECT.
- Theme: toggle root `.light` class + persist; existing tokens already support both.
- Realtime: enable on `notifications` and `claims`.
- No existing functionality removed; all routes preserved.

### What I need from you
1. Approve this 3-stage split (vs. shipping everything at once — high regression risk).
2. Confirm Stage A scope above is correct starting point.
