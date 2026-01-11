# PayAdjust - Payroll Management System

## Product Overview

PayAdjust is a payroll management system that gives employees visibility and flexibility over their pay before it's processed. Admins manage payroll generation and processing, while employees can adjust pension contributions and see tax implications in real-time.

### Core Concept
- **Admins add employees** to their organization (employees don't self-register)
- Payslips are generated ~7 days before processing
- Employees can adjust pension contributions during this window
- System shows estimated pay and tax bracket implications
- Admins approve changes or system auto-adjusts with notification
- Payments are then processed

### Multi-Organization Support
- A single user account can belong to **multiple organizations** (e.g., contractors)
- Each organization has its own admins, employees, payroll periods, and payslips
- Users see an organization switcher if they belong to multiple orgs
- Employee details (salary, tax code, pension) are per-organization

---

## Current Status: Multi-Organization MVP Complete & Deployed

All core functionality is implemented with multi-organization support. The app is live and deployed.

### Deployment Info
- **Live URL:** https://payadjust.com (custom domain)
- **Vercel URL:** https://pay-lens-bice.vercel.app (legacy)
- **GitHub:** https://github.com/Stamp-Immersive/pay-lens
- **Hosting:** Vercel (auto-deploys from main branch)
- **Database:** Supabase (hosted, free tier)
- **Email:** Resend (for invite emails)

### Access Control
Signups are currently restricted to allowed emails only:
- `hello@rupertstamp.com`
- `xstamp3@gmail.com`

To add more users, edit `src/app/auth/callback/route.ts` → `allowedEmails` array.

### Features Live
- Admin management of employees, payroll periods, and payments per organization
- Employee viewing of payslips and pension adjustment during preview
- UK tax/NI calculations for 2024/25
- BACS/CSV export for bank transfers
- Organization switcher for users in multiple organizations
- Organization creation and onboarding
- Email invite system with pending invite acceptance

**Database Status:** All migrations applied (001_payroll_schema.sql, 002_multi_org.sql, 003_fix_profiles_rls.sql, 004_pending_invites.sql, 005_add_job_title.sql)

### Recent Session - Branding & Custom Domain (Jan 2026)

#### Rebranding to PayAdjust
- [x] Connected custom domain payadjust.com to Vercel
- [x] Renamed all text from "PayLens" to "PayAdjust" throughout the app
- [x] Updated email sender to `PayAdjust <noreply@payadjust.com>`
- [x] Updated environment variables for new domain

#### Brand Identity
- [x] Added Stack Sans Notch font (SemiBold 600) via Google Fonts
- [x] Created `src/lib/fonts.ts` for font configuration
- [x] Created `src/components/Logo.tsx` with black/silver gradient text effect
- [x] Generated favicon with Puppeteer (PA letters, dark background, gradient)
- [x] Organized brand assets in `public/brand/` folder:
  - `logo.png` - Full "PayAdjust" logo
  - `favicon.png` - "PA" icon (512x512)
  - `icon-512.png` - High-res icon
- [x] Added `capture-logo.js` script for regenerating logos with correct font

#### UI Enhancements
- [x] Added dynamic spotlight hover effect to interactive elements
- [x] Created `src/hooks/useSpotlight.ts` for mouse-tracking spotlight
- [x] Applied spotlight to: buttons, tabs, dropdown menu items, admin nav links
- [x] Fixed badge clipping on admin nav tabs (moved badge outside overflow-hidden)

#### Known Limitations
- **Google OAuth consent screen** shows Supabase URL ("continue to szxobwgbaeowrxyndijo.supabase.co") - this is a Supabase free tier limitation. Custom auth domains require Supabase Pro plan.

### Previous Session - Job Title Feature (Jan 2026)
- [x] Created migration `005_add_job_title.sql` to add job_title column to employee_details
- [x] Updated `EmployeeWithDetails` type to include job_title
- [x] Updated `getEmployees()` and `getEmployee()` to return job_title
- [x] Updated `upsertEmployeeDetails()` to accept and save job_title
- [x] Added job_title input field to EmployeeForm
- [x] Fixed form pre-fill issue with useEffect to sync employee prop changes
- [x] Updated EmployeesList table to show "Job Title" column instead of org role

**Note:** Migration needs to be applied to production Supabase database before the job_title feature will work.

---

## Technical Phases

### Phase 1: Authentication (COMPLETE)
- [x] Supabase setup with Google OAuth
- [x] Role-based routing (admin/employee) per organization
- [x] Protected routes

### Phase 2: Database Schema (COMPLETE)
- [x] Employees table (salary, tax code, pension defaults, bank details)
- [x] Payroll periods table (month/year, status: draft/preview/approved/processed)
- [x] Payslips table (employee, period, gross, deductions, net, pension, tax, NI)
- [x] Adjustments table (employee changes to payslips)
- [x] Notifications table (admin notifications for changes)

### Phase 3: Admin - Employee Management (COMPLETE)
- [x] List all employees with active/inactive toggle
- [x] Admin adds employees to organization (not self-registration)
- [x] Set up employee details (name, department, job title, salary, tax code, pension %, bank details)
- [x] Edit employee details
- [x] Deactivate/reactivate employee (soft delete)
- [x] "Needs Setup" indicator for employees without payroll details
- [x] Job title field added to employee details (displays in employee list)

### Phase 4: Admin - Payroll Generation (COMPLETE)
- [x] Create new payroll period (month/year)
- [x] Auto-generate payslips for all active employees
- [x] UK tax calculation (basic/higher/additional rates)
- [x] National Insurance calculation (employee and employer)
- [x] Salary sacrifice pension (pre-tax deduction)
- [x] Payroll summary view (total gross, net, tax, NI, pension)
- [x] Status workflow: draft → preview → approved → processed

### Phase 5: Employee - Payslip Preview & Adjustment (COMPLETE)
- [x] View current/upcoming payslip
- [x] Pension contribution slider (3-10%)
- [x] Real-time pay calculator (gross → tax → NI → pension → net)
- [x] Impact summary (take-home change, pension change, tax savings)
- [x] Submit adjustment with confirmation dialog
- [x] Adjustment only allowed during preview period
- [x] Payslip history with detail view

### Phase 6: Admin - Approval & Notifications (PARTIAL)
- [x] Approve payroll to lock adjustments
- [x] View adjusted payslips (badge indicator)
- [ ] Real-time notification system for employee changes
- [ ] Individual payslip approval/rejection
- [ ] Auto-approve option with notification only

### Phase 7: Payment Processing (PARTIAL)
- [x] View approved periods ready for payment
- [x] CSV export for spreadsheet/manual processing
- [x] BACS Standard 18 format export for UK bank transfers
- [x] Mark payments as processing/processed
- [x] Payment statistics (pending, processing, paid this year)
- [x] Missing bank details warning
- [ ] Payment provider integration (Stripe/Wise/banking API)
- [ ] Automatic batch payment submission
- [ ] Payment confirmation emails
- [ ] Payslip PDF generation

### Phase 8: Polish & Extras (PARTIAL)
- [x] Pay history for employees
- [x] Dark mode support
- [ ] Annual summary/P60 equivalent
- [ ] Admin reporting dashboard
- [ ] Email notifications
- [ ] Audit log for changes

### Phase 9: Multi-Organization Support (COMPLETE)
This phase adds support for multiple organizations and contractors.

#### Database Changes
- [x] Create `organizations` table (id, name, slug, settings)
- [x] Create `organization_members` junction table (org_id, profile_id, role)
- [x] Add `organization_id` foreign key to:
  - `employee_details`
  - `payroll_periods`
  - `notifications`
- [x] Update RLS policies for organization-scoped access
- [x] Helper functions: `is_org_member()`, `is_org_admin()`, `is_org_owner()`

#### Admin Features
- [x] Organization creation (onboarding page)
- [x] Invite employees by email (with Resend email integration)
- [x] Organization switcher in header
- [x] Pending invites management (view, cancel)
- [ ] Organization settings page (partial)
- [ ] Transfer ownership

#### Employee Features
- [x] Organization switcher in header (if member of multiple orgs)
- [x] Per-organization payslip history
- [x] Accept/decline organization invitations (pending invites UI)

#### Contractor Support
- [x] Same user can be employee in multiple organizations
- [x] Separate salary/tax/pension settings per organization
- [ ] Aggregated view of all payslips across organizations (optional)

---

## File Structure

### Server Actions
- `src/lib/actions/organizations.ts` - Organization CRUD and member management
- `src/lib/actions/employees.ts` - Employee CRUD operations (org-scoped)
- `src/lib/actions/payroll.ts` - Payroll period and payslip management (org-scoped)
- `src/lib/actions/payments.ts` - Payment processing and exports (org-scoped)
- `src/lib/actions/employee.ts` - Employee self-service (org-scoped)
- `src/lib/actions/invites.ts` - Invite accept/decline actions

### Email
- `src/lib/email/resend.ts` - Resend email client
- `src/lib/email/templates/invite.ts` - Invite email HTML template

### Admin Pages (Multi-Org)
- `/dashboard` - Redirect to default organization
- `/dashboard/[orgSlug]/admin` - Dashboard with stats
- `/dashboard/[orgSlug]/admin/employees` - Employee management
- `/dashboard/[orgSlug]/admin/payroll` - Payroll periods list
- `/dashboard/[orgSlug]/admin/payroll/[periodId]` - Period detail with payslips
- `/dashboard/[orgSlug]/admin/payments` - Payment processing and exports

### Employee Pages (Multi-Org)
- `/dashboard/[orgSlug]/employee` - Employee dashboard with tabs:
  - Current Payslip - View current/preview payslip
  - Pension Calculator - Adjust pension with impact preview
  - History - Past payslips with detail view

### Onboarding & Invites
- `/onboarding` - Create organization or accept pending invites
- `/invites` - View and accept/decline pending organization invitations

### Components
- `src/components/admin/` - Admin UI components
  - `AdminNav.tsx` - Navigation bar (uses org context)
  - `EmployeesList.tsx` - Employee table with actions (accepts orgId)
  - `EmployeeForm.tsx` - Add/edit employee dialog (accepts orgId)
  - `PayrollPeriodsList.tsx` - Payroll periods table (accepts orgId)
  - `PayrollPeriodDetail.tsx` - Period view with payslips (accepts orgId)
  - `CreatePeriodDialog.tsx` - New period creation (accepts orgId)
  - `PaymentsList.tsx` - Payment processing UI (accepts orgId)

- `src/components/employee/` - Employee UI components
  - `CurrentPayslip.tsx` - Payslip display
  - `PensionAdjustment.tsx` - Pension calculator (accepts orgId)
  - `PayslipHistory.tsx` - Historical payslips table

- `src/components/OrganizationSwitcher.tsx` - Org dropdown for multi-org users
- `src/components/Logo.tsx` - PayAdjust logo with Stack Sans Notch font and gradient

- `src/contexts/OrganizationContext.tsx` - Organization context provider

- `src/hooks/useSpotlight.ts` - Mouse-tracking spotlight effect for interactive elements

- `src/lib/fonts.ts` - Google Fonts configuration (Stack Sans Notch)

### Database
- `supabase/setup.sql` - Initial profiles table and RLS
- `supabase/migrations/001_payroll_schema.sql` - Payroll schema
- `supabase/migrations/002_multi_org.sql` - Multi-organization support
- `supabase/migrations/003_fix_profiles_rls.sql` - Fix profiles RLS for org member visibility
- `supabase/migrations/004_pending_invites.sql` - Pending invites table for non-users
- `supabase/migrations/005_add_job_title.sql` - Add job_title column to employee_details

---

## UK Payroll Calculations Reference

### Tax Bands 2024/25
- Personal Allowance: £12,570 (0%)
- Basic Rate: £12,571 - £50,270 (20%)
- Higher Rate: £50,271 - £125,140 (40%)
- Additional Rate: £125,140+ (45%)
- Personal allowance reduces by £1 for every £2 over £100k

### National Insurance 2024/25 (Employee)
- Primary Threshold: £12,570
- Upper Earnings Limit: £50,270
- Rate below UEL: 8%
- Rate above UEL: 2%

### National Insurance 2024/25 (Employer)
- Secondary Threshold: £9,100
- Rate: 13.8%

### Pension
- Employee contribution: 3-10% (adjustable by employee)
- Employer contribution: typically 3% (set per employee)
- Salary sacrifice reduces gross pay before tax calculation

---

## Remaining Work

### High Priority
1. ~~**Admin Invites Employees**~~ - ✅ COMPLETE (Resend email integration)
2. **Notifications** - Real-time admin notifications when employees adjust
3. **Organization Settings** - Full settings page for org admins

### Medium Priority
4. **PDF Payslips** - Generate downloadable payslip PDFs
5. **Email Notifications** - Send payslip emails to employees
6. **Payment Integration** - Connect to Stripe/Wise for actual payments
7. **Reporting** - Admin reports (monthly, annual, department breakdowns)

### Low Priority
8. **P60 Generation** - Annual tax summary for employees
9. **Audit Log** - Track all changes for compliance
10. **Bulk Operations** - Bulk salary updates, bulk bonus entry
11. **API** - REST API for third-party integrations

---

## Architecture Notes

### Authentication & Authorization
- Supabase Auth with Google OAuth
- Profiles table stores user info (no global role - roles are per-organization)
- Organization membership determines access and role
- Server pages use `export const dynamic = 'force-dynamic'` for auth

### Employee Onboarding Flow
1. Admin creates organization (or uses existing)
2. Admin invites employee by email
3. Employee receives invite, signs in with Google
4. Employee is linked to organization with "employee" role
5. Admin sets up employee payroll details (salary, tax code, etc.)
6. Employee can now view payslips when generated

### Data Flow
1. Admin creates payroll period (draft)
2. Admin generates payslips (calculates tax/NI/pension for each employee)
3. Admin starts preview (employees can now see and adjust)
4. Employees adjust pension if desired (recalculates their payslip)
5. Admin approves (locks adjustments)
6. Admin exports BACS/CSV for bank
7. Admin marks as processed (payslips become "paid")

### Security
- Row Level Security (RLS) on all tables (profiles, organizations, organization_members, employee_details, payroll_periods, payslips, payslip_adjustments, notifications, pending_invites)
- All data scoped to organization
- Admins have full access within their organization
- Employees can only view/update their own records
- Pension adjustments only allowed during preview period
- Profiles RLS allows org members to see fellow members (fixed in 003_fix_profiles_rls.sql)
- Service role key used server-side only for org creation (bypasses RLS safely after auth verification)
- Email allowlist restricts who can sign up (development mode)

### Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_APP_URL=https://payadjust.com
RESEND_API_KEY=re_xxx (optional - logs to console if not set)
```

### Multi-Organization Data Model
```
organizations
  ├── organization_members (junction: profiles ↔ organizations)
  │     └── role: 'owner' | 'admin' | 'employee'
  ├── employee_details (org-scoped salary, tax, pension)
  ├── payroll_periods (org-scoped)
  │     └── payslips (employee + period)
  │           └── payslip_adjustments
  └── notifications (org-scoped)
```
