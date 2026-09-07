---
name: Demo versus production boundary
description: ARKA OS currently presents a role-separated local demo because Supabase integration was declined.
---

ARKA OS must clearly label its current workspace as demo data and must not imply that authentication, persistence, presence, comments, assignments, or permissions are production-secure while the Supabase connection is absent.

**Why:** The operating-system brief requires real auth, PostgreSQL persistence, and RLS, but the workspace owner declined the Supabase connection. The honest fallback is a functional browser-state prototype with explicit limitations.

**How to apply:** Preserve the role-specific UI and local interactions, but describe persistence, cross-session visibility, login/logout history, and server-side authorization as pending until a database/auth integration is accepted.