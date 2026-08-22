# TeraByte Computer Academy — Portal v5

## v5 changelog (bug fixes + mobile rebuild)
- **Nothing actually worked — logout, the admin dashboard, and the whole student portal were all broken by the same missing code**: `app.js` and `student.js` call `SB()`, `requireRole()` and `logout()` everywhere, but none of those three functions were defined *anywhere* in the project. In `student.js` this crashed the script immediately on load (a bare reference to the undefined `logout` identifier throws before `init()` ever runs), so the student portal never loaded any data at all. On the dashboard, `init()` immediately called the undefined `requireRole()`, breaking startup the same way. Added real implementations of `SB()`, `requireRole(kind)` and `logout()` to `auth.js` (loaded before both page scripts), including login-page redirects and admin/teacher-vs-student role checks.
- **The entire backend was missing**: the README documented `supabase/schema.sql` plus two Edge Functions (`create-student`, `delete-student`) that the frontend depends on for every admission and deletion — but none of these files existed in the repository at all. Without them, "Complete Registration" and "Delete" could never succeed no matter what was fixed in the browser code. Added the full `supabase/schema.sql` (tables, `next_admission_no()`, RLS policies, storage bucket) and both Edge Functions under `supabase/functions/`.
- **Student "My Profile" page was unstyled**: it used `.details-grid` / `.detail` CSS classes that were never defined in `styles.css`, so it rendered as a plain wall of text. Added proper card-grid styling.
- **Mobile navigation rebuilt properly**: the sidebar previously became a cramped horizontally-scrolling strip on small screens. Replaced it with a real slide-in drawer (hamburger button + backdrop + body-scroll lock) on both the admin dashboard and student portal, plus tightened spacing for toasts, modals and the topbar at phone widths.

# TeraByte Computer Academy — Portal v4

## v4 changelog (bug fixes)
- **`column "admission_no" does not exist`**: `supabase/schema.sql` was missing from the project entirely, so this database never had a `students` table (or `next_admission_no()` function) with the columns the frontend expects. Added the full schema below — run it once in the SQL Editor and the error goes away.
- **Admin ID Card tab was broken**: `app.js` called a `photoUrl()` helper that only existed in `student.js` (which `dashboard.html` never loads). Every admin attempt to preview or download a student ID card threw `photoUrl is not defined`. Added the missing function to `app.js`.
- **Student ID card download silently failed**: `student.html`'s Content-Security-Policy allowed scripts from `cdn.jsdelivr.net` but not `cdnjs.cloudflare.com`, which is where `html2canvas` is loaded from. The browser blocked the script, so "Download ID Card JPG" did nothing. Added `cdnjs.cloudflare.com` to `script-src`.
- **Editing a student could silently blank out their course**: the "Edit Student" modal's course dropdown had `ADCA — Computer Applications`, but the admission form uses `ADCA — Advanced Diploma`. Since the text didn't match any option, the select fell back to its default entry when editing an ADCA student, and saving would overwrite their real course. The two lists now match exactly.
- **Unauthenticated visitors hit a raw DB error instead of the login redirect**: `app.js` requested the next admission number (an authenticated RPC call) before checking whether the visitor was actually a signed-in staff member. Reordered so the auth check runs first.
- **Reset button left a stale photo behind**: clicking "Reset" on the admission form refetched the admission number but never cleared the selected photo file/preview, so a leftover photo could get attached to the next registration. It now calls the same cleanup used after a successful registration.

# TeraByte Computer Academy — Portal v3

This version changes the system from a browser-only demo into a **Supabase-backed academy portal**.

## Included
- Existing `logo.png` reference is preserved. No logo redesign.
- No Attendance section.
- Admin login and student login.
- Student username + randomly generated temporary password during admission.
- Student portal with profile, fee status, ID card, blog/notices and messages.
- Admin student management, fees, certificates, ID-card JPG download, registration-record JPG download.
- Blog/notice publishing from admin; published content appears in student portals.
- Private or all-student messaging from admin.
- Database-backed records; no student/fee/post/message data is stored in `localStorage`.
- Student photos uploaded to Supabase Storage.
- Row Level Security policies in `supabase/schema.sql`.
- Edge Functions for secure student account creation and deletion.

## Important: GitHub Pages alone is not enough
GitHub Pages can host the frontend, but it cannot safely create users with a service-role key. Use Supabase for Auth + PostgreSQL + Storage + Edge Functions.

## Setup
1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Create your first administrator in **Authentication → Users**.
4. Set that account's metadata role to `admin`, or run the example SQL at the bottom of `schema.sql`.
5. Deploy both Edge Functions:
   - `supabase functions deploy create-student`
   - `supabase functions deploy delete-student`
6. Make sure the Edge Function environment has the normal Supabase URL/anon key and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never put the service-role key in website files.
7. Copy your Supabase project URL and anon/publishable key into `config.js`.
8. Put the academy's existing `logo.png` beside `index.html`.
9. Host the folder on GitHub Pages, Netlify, Vercel, etc.

## Student credentials
The admission form calls the `create-student` Edge Function. The function creates a real Supabase Auth account using a synthetic student email behind the scenes, e.g. `tb20260001@students.terabyte.academy`, and returns:
- Username: `tb20260001`
- Temporary password: randomly generated

The password is displayed once to the administrator after registration. It is not written to localStorage or included in the registration JPG.

## Registration JPG and ID Card JPG
Both are rendered in the browser with html2canvas and downloaded as `.jpg` files. There is no print workflow.

## Security
- Never put a Supabase service-role key in `config.js` or frontend JavaScript.
- RLS protects students so they can read only their own profile and messages, while published posts are visible to authenticated students.
- Admin/teacher privileges are enforced by the Edge Functions and database policies.
- For a stronger production setup, change the storage bucket to private and use signed URLs for student photos.
