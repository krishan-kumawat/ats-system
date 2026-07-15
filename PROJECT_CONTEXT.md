# ATS System — Project Context

## What this is

An internal Applicant Tracking System (ATS) built as a Next.js web application. It manages the full hiring pipeline: job requisitions, candidate ingestion, pipeline stages, scorecards, offer approvals, hiring manager assignments, role-based permissions, and a user management system. All data is stored in a Neon PostgreSQL database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.10 (App Router) |
| Runtime | React 19 with React Compiler |
| Language | TypeScript (strict) |
| ORM | TypeORM v1.0.0 — `EntitySchema` only, no decorators |
| Database | Neon PostgreSQL (serverless), SSL required |
| Auth | httpOnly cookie sessions via `iron-session` pattern |
| Styling | Tailwind CSS v4 |
| Icons | Font Awesome (CDN, `fa-solid` prefix) |

### Critical Next.js config
```js
// next.config.mjs
serverExternalPackages: ["typeorm"]
```
TypeORM must be in `serverExternalPackages` or it will fail to bundle.

---

## Project Structure

```
src/
  app/
    actions/          # All server actions ("use server")
      auth.ts         # login, logout
      data.ts         # fetchInitialData, fetchApplicantsAction
      jobs.ts         # createJobAction
      candidates.ts   # candidate ingest
      assignments.ts  # HM assignment, fetchHiringManagerUsersAction
      scorecard.ts    # scorecard save
      permissions.ts  # role permission updates
      audit.ts        # writeAuditAction, fetchAuditLogsAction
      users.ts        # Founder-only user CRUD + activate/deactivate
    login/page.tsx    # Login page
    page.tsx          # Root page — server component, calls fetchInitialData
    layout.tsx
  components/
    ats/
      ATSClient.tsx         # Main client shell — tab routing, session, toast
      Sidebar.tsx           # Navigation sidebar (role-gated tabs)
      Header.tsx
      JobsPanel.tsx
      AddJobModal.tsx       # Combobox for HM selection
      ApplicantsPanel.tsx   # Applicant table + Change HM modal
      PipelineBoard.tsx
      EvaluationWorkspace.tsx
      AnalyticsPanel.tsx
      AuditLogPanel.tsx
      PermissionsPanel.tsx
      JobAssignmentPanel.tsx
      UsersPanel.tsx        # Founder-only user management
      AddCandidateModal.tsx
      Toast.tsx
  db/
    schemas.ts        # All EntitySchema definitions + interfaces
    data-source.ts    # withDb() helper, connection pooling
    seed.ts           # Database seed script
    migrate-head-of-hr.ts
    migrate-hm-override.ts   # adds assignedHiringManagerId to applications
    migrate-user-active.ts   # adds isActive to users
  lib/
    enums.ts          # All enums: UserRole, JobStatus, ApplicationStage, etc.
    permissions.ts    # RBAC: Permission type, DEFAULT_ROLE_PERMISSIONS, ROLE_META
    atsStore.ts       # Client-side Zustand store + static seed data
    auth.ts           # createSession, destroySession, getSession
    auth-config.ts    # Static fallback users + SessionPayload interface
    parser.ts         # Resume parser
  middleware.ts       # Route protection — redirects unauthenticated to /login
```

---

## Database Schema

### Table: `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | generated |
| email | varchar unique | |
| name | varchar | |
| role | enum | FOUNDER, RECRUITER, HIRING_MANAGER, ADMIN, HEAD_OF_HR |
| passwordHash | varchar | plain text in dev — no bcrypt |
| isActive | boolean | default true — added via migration |
| createdAt | timestamptz | auto |

### Table: `jobs`
| Column | Type | Notes |
|---|---|---|
| id | varchar PK | |
| title | varchar | |
| department | varchar | |
| hiringManagerId | uuid FK → users.id | |
| hiringManagerName | varchar | denormalised display name |
| status | enum | DRAFT, OPEN, ON_HOLD, CLOSED |
| gDriveFolderId | varchar nullable | |
| budgetLimit | decimal(12,2) | |
| createdAt | timestamptz | auto |

### Table: `candidates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | varchar | |
| email | varchar unique | |
| phone | varchar nullable | |
| currentCompany | varchar nullable | |
| skills | jsonb | string array |
| createdAt | timestamptz | auto |

### Table: `applications`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| candidateId | uuid FK → candidates.id | |
| jobId | varchar FK → jobs.id | |
| stage | enum | APPLIED → SCREENING → INTERVIEWING → OFFER_PREP → OFFER_APPROVED → HIRED → ARCHIVED |
| sourceTag | varchar | default "MANUAL" |
| gDriveFileId | varchar | |
| gDriveViewUrl | varchar | |
| expectedSalary | decimal(12,2) nullable | |
| assignedHiringManagerId | uuid nullable FK → users.id | per-applicant HM override |
| createdAt | timestamptz | auto |

### Table: `scorecards`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| applicationId | uuid FK → applications.id | |
| reviewerId | uuid FK → users.id | |
| technicalScore | smallint | 1–5 (CHECK constraint) |
| systemScore | smallint | 1–5 (CHECK constraint) |
| cultureScore | smallint | 1–5 (CHECK constraint) |
| pros | text nullable | |
| cons | text nullable | |
| recommendation | enum | STRONG_HIRE, HIRE, NO_HIRE, STRONG_NO_HIRE |
| createdAt | timestamptz | auto |

### Table: `founder_approvals`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| applicationId | uuid FK → applications.id | |
| founderId | uuid nullable FK → users.id | |
| proposedSalary | decimal(12,2) | |
| proposedEquity | decimal(6,4) nullable | |
| status | enum | PENDING, APPROVED, REJECTED |
| feedback | text nullable | |
| createdAt | timestamptz | auto |
| actionedAt | timestamptz nullable | |

### Table: `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | auto-increment |
| userId | **varchar** | NOT uuid — supports both static users (usr-0001) and UUID users |
| action | varchar | e.g. USER_CREATED, USER_DEACTIVATED, HM_REASSIGNED |
| targetTable | varchar | |
| targetId | varchar | |
| notes | text nullable | |
| oldValues | jsonb nullable | |
| newValues | jsonb nullable | |
| timestamp | timestamptz | auto |

> `userId` is `varchar`, not `uuid`. This is intentional — static fallback users have non-UUID ids. No FK constraint on this column.

### Table: `role_permissions`
| Column | Type | Notes |
|---|---|---|
| id | int PK | auto-increment |
| role | enum | |
| permissionKey | varchar | |
| granted | boolean | default false |
| updatedAt | timestamptz | auto |
| — | unique(role, permissionKey) | |

### Table: `job_assignments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jobId | varchar FK → jobs.id | |
| assignedToId | uuid FK → users.id | |
| assignedById | uuid FK → users.id | |
| note | text nullable | |
| assignedAt | timestamptz | auto |
| — | unique(jobId, assignedToId) | |

---

## Roles & Permissions

Five roles exist. Permissions are stored in `role_permissions` table and fall back to `DEFAULT_ROLE_PERMISSIONS` in code.

| Permission | FOUNDER | HEAD_OF_HR | ADMIN | RECRUITER | HIRING_MGR |
|---|:---:|:---:|:---:|:---:|:---:|
| canAddJob | ✓ | ✓ | ✓ | ✓ | — |
| canIngestCandidate | ✓ | ✓ | ✓ | ✓ | — |
| canDragPipeline | ✓ | ✓ | ✓ | ✓ | — |
| canViewAuditLog | ✓ | ✓ | ✓ | — | — |
| canApproveOffer | ✓ | — | — | — | — |
| canViewAnalytics | ✓ | ✓ | ✓ | ✓ | ✓ |
| canEditScorecard | ✓ | ✓ | — | — | ✓ |
| canManagePermissions | ✓ | — | — | — | — |
| canAssignJobs | ✓ | ✓ | — | — | — |

FOUNDER permissions are locked and cannot be changed via the UI.

---

## Authentication

- Login via `loginAction` server action (POST to `/`)
- First tries DB user lookup (`users` table, matches by email + passwordHash)
- If DB user `isActive === false` → returns error "Your account has been deactivated."
- Falls back to static `USERS` list in `auth-config.ts` if not found in DB
- Session stored as signed httpOnly cookie (`ats_session`)
- `getSession()` decodes cookie and returns `SessionPayload { id, name, email, role }`
- `middleware.ts` redirects unauthenticated requests to `/login`

### Static fallback users (for dev / before DB seed)
| Email | Password | Role |
|---|---|---|
| founder@orgats.com | Founder@123 | FOUNDER |
| recruiter@orgats.com | Recruiter@123 | RECRUITER |
| recruiter2@orgats.com | Recruiter2@123 | RECRUITER |
| admin@orgats.com | Admin@123 | ADMIN |
| admin2@orgats.com | Admin2@123 | ADMIN |
| hiring@orgats.com | Hiring@123 | HIRING_MANAGER |
| hiring2@orgats.com | Hiring2@123 | HIRING_MANAGER |
| headofhr@orgats.com | HeadHR@123 | HEAD_OF_HR |

Static users have non-UUID ids (`usr-0001` etc.) — this is why `audit_logs.userId` is `varchar`.

---

## DB Connection Pattern

All DB access goes through `withDb()`:

```ts
// src/db/data-source.ts
export async function withDb<T>(fn: (ds: DataSource) => Promise<T>): Promise<T>
```

- Uses a global singleton `DataSource` (`global.__typeormDataSource`)
- On `ECONNRESET / ECONNREFUSED / ETIMEDOUT` — destroys pool, reconnects, retries once
- Neon serverless suspends idle computes; this handles the wake-up transparently
- Pool config: max 5 connections, idle timeout 60s

### Inline column migration pattern

Some columns were added after initial schema creation. Instead of requiring a separate migration run, actions call an idempotent helper before every query:

```ts
async function ensureIsActiveColumn(ds) {
  await ds.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE
  `);
}
```

This is called inside `withDb` before any SELECT/UPDATE on users.

---

## Server Actions

All server actions live in `src/app/actions/`. They are `"use server"` files, called directly from client components. Each action:
1. Calls `getSession()` — returns error if not authenticated
2. Checks `session.role` for authorization
3. Uses `withDb()` for all DB operations
4. Calls `revalidatePath("/")` after mutations

### Key patterns

**Raw SQL for updates** (bypasses TypeORM change-tracking):
```ts
await ds.query(`UPDATE users SET "isActive" = $1 WHERE id = $2`, [isActive, userId]);
```

**Audit logging** — every sensitive mutation saves to `audit_logs`:
```ts
await auditRepo.save(auditRepo.create({
  userId: session.id,   // varchar — can be "usr-0001" or a UUID
  action: "USER_DEACTIVATED",
  targetTable: "users",
  targetId: userId,
  notes: `User "X" deactivated by Founder.`,
  oldValues: { isActive: true },
  newValues: { isActive: false },
}));
```

**Do NOT use `relations` when fetching `AuditLog`**:
```ts
// WRONG — crashes because userId is varchar but users.id is uuid
ds.getRepository("AuditLog").find({ relations: { user: true } })

// CORRECT
ds.getRepository("AuditLog").find({ order: { timestamp: "ASC" } })
```

---

## Hiring Manager Assignment

Two levels of HM assignment exist:

1. **Job-level** — `jobs.hiringManagerId` + `jobs.hiringManagerName` — set when creating a job
2. **Per-applicant override** — `applications.assignedHiringManagerId` — set by HEAD_OF_HR or FOUNDER

Effective HM is resolved in SQL:
```sql
COALESCE(uhm.name, j."hiringManagerName") AS "hiringManager"
```
Where `uhm` is a LEFT JOIN on `users` via `assignedHiringManagerId`.

When a new job is created, all existing applicants for that job are bulk-assigned:
```sql
UPDATE applications SET "assignedHiringManagerId" = $1 WHERE "jobId" = $2
```

Only HIRING_MANAGER and HEAD_OF_HR users appear in the HM combobox (`fetchHiringManagerUsersAction`).

---

## User Management (Founder Only)

Three-layer access guard:
1. Sidebar tab hidden for non-FOUNDER roles
2. `ATSClient.tsx` renders `<PermissionDenied>` for non-FOUNDER
3. Every server action in `users.ts` checks `session.role !== UserRole.FOUNDER`

### Server actions in `users.ts`

| Action | Description |
|---|---|
| `fetchUsersAction()` | Returns all users, active first |
| `createUserAction(input)` | Creates user with `isActive: true`, audit log |
| `updateUserAction(input)` | Updates name/email/role/password, audit log |
| `toggleUserActiveAction(userId, isActive)` | Activate/deactivate; blocks self-deactivation |

### `ensureIsActiveColumn` 
Called at the top of every DB operation in `users.ts` to idempotently add the column if missing.

### Sort order
Users are always returned `ORDER BY "isActive" DESC, "createdAt" DESC` — active users first.

---

## Tabs / Navigation

Sidebar tabs and their access:

| Tab key | Label | Minimum role |
|---|---|---|
| pipeline | Pipeline | All |
| applicants | Applicants | All |
| jobs | Jobs | All |
| analytics | Analytics | HIRING_MANAGER+ |
| assignments | Job Assignments | HEAD_OF_HR, FOUNDER |
| audit | Audit Log | ADMIN+ |
| permissions | Permissions | FOUNDER |
| users | User Management | FOUNDER |

---

## Migration Scripts

```bash
npm run db:setup                   # seed initial data
npm run db:migrate:head-of-hr      # adds HEAD_OF_HR role support
npm run db:migrate:hm-override     # adds applications.assignedHiringManagerId
npm run db:migrate:user-active     # adds users.isActive
```

All migrations use `ADD COLUMN IF NOT EXISTS` — safe to run multiple times.

---

## Known Constraints

- Passwords are stored as plain text (`passwordHash` column stores the raw password). No bcrypt.
- Static fallback users in `auth-config.ts` have non-UUID ids (`usr-0001`). This is why `audit_logs.userId` must be `varchar` not `uuid`, and why no FK constraint exists on that column.
- `synchronize: false` in TypeORM config — schema changes require explicit migrations.
- Do not call `.find({ relations: { user: true } })` on `AuditLog` — the `userId` type mismatch (varchar vs uuid) causes a PostgreSQL operator error.
- The `HEAD_OF_HR` role must be included in all role-iteration loops (e.g. the permissions builder loop in `data.ts`) or its permission set will be `undefined` and crash the UI.
