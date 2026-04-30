# Inventory Management System - Technical Specification
## Based on PRD v2.1 + Interview Refinements

---

## Executive Summary

A web application replacing Google Sheets for managing shared inventory across Business A and Business B. Tracks ~95 inventory items with complete transaction history, business attribution, and automated alerts.

**Key Architecture**: One company, two brands. All staff see all data. Every transaction manually tagged to a brand. Simplified MVP scope (no offline/PWA, no email).

---

## Interview Decisions Summary

| Area | Decision |
|------|----------|
| Sync conflicts | Allow negative stock + alert owners |
| Cost method | Snapshot price at transaction time |
| Business selection | Smart suggestion (show last-used prominently, no pre-select) |
| Data retention | 12 months live, archive older |
| Emergency approvals | No override - wait for owner |
| Recent items | Category-based quick picks (aggregate usage) |
| Reorder thresholds | Single company-wide threshold per item |
| Session timeout | 1-2 hours (shorter than PRD's 8 hours) |
| Post-submit edits | 5-minute edit window |
| Low stock alerts | In-app all users, SMS/email owners for critical (zero) only |
| Restock pricing | Use item's current cost (staff don't handle pricing) |
| Quick consume UI | Always ask quantity (no defaults) |
| Decimal quantities | Configurable per item (`allows_decimal` flag) |
| Expiration tracking | Optional per item (`tracks_expiration` flag); required on restock when enabled; 7-day alert threshold; FIFO visual guidance only |
| Accounting | CSV export sufficient |
| Language | English only |
| Data migration | Fresh start - current stock levels only |
| Database | Railway (raw PostgreSQL) |
| Item deactivation | `is_active` toggle with separate UI section |
| Quick action buttons | Removed entirely |
| Staff approval visibility | Count only, not details |
| Staff authentication | Email + 4-6 digit PIN |
| Owner authentication | Email + password |
| Confirmation modal | Visual color-coding only |
| Testing | Hybrid: unit + critical path + E2E |
| Support channel | Direct to developer during launch |
| **MVP cuts** | Offline/PWA capability, Email notifications |
| Home screen install | Basic manifest only (no service worker) |

---

## Revised MVP Scope

### Included in MVP
- User authentication (PIN for staff, password for owners)
- Item management (CRUD, categories, pricing)
- Transaction logging (add, consume) with business tagging
- Optional expiration date tracking with FIFO visual guidance
- Adjustment workflow (submit → owner approval)
- Visual dashboard with status indicators and expiring-soon alerts
- Transaction history and audit trail
- In-app notifications
- Cost allocation reports with CSV export
- Basic web manifest (Add to Home Screen icon)
- Responsive mobile-first design

### Deferred to Phase 2
- Offline capability (service worker, IndexedDB, background sync)
- Email notifications (Resend integration)
- SMS alerts (Twilio)
- Push notifications
- Barcode scanning
- Purchase order management
- Advanced analytics

---

## Data Model Updates

### Items Table (Updated)
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  item_description VARCHAR(255) NOT NULL,
  unit_of_measure VARCHAR(50) NOT NULL,
  allows_decimal BOOLEAN NOT NULL DEFAULT false,  -- NEW: configurable per item
  tracks_expiration BOOLEAN NOT NULL DEFAULT false,  -- NEW: enables expiration date tracking per item

  quantity_in_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_unit_cost_php DECIMAL(10,2) NOT NULL,
  stock_value_php DECIMAL(10,2) GENERATED ALWAYS AS
    (quantity_in_stock * current_unit_cost_php) STORED,

  reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
  inventory_log_type VARCHAR(50),
  order_code VARCHAR(100) UNIQUE,
  primary_business VARCHAR(50),

  primary_supplier TEXT,
  alternative_suppliers TEXT,
  notes TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,  -- NEW: soft deactivation

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id UUID REFERENCES users(id),

  CONSTRAINT unique_item_per_category UNIQUE(category_id, item_description),
  CONSTRAINT positive_cost CHECK (current_unit_cost_php > 0),
  CONSTRAINT valid_primary_business CHECK (
    primary_business IS NULL OR
    primary_business IN ('Business A', 'Business B', 'Shared')
  )
);
```

### Transactions Table (Updated)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  business_entity VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,

  quantity_change DECIMAL(10,2) NOT NULL,
  stock_after_transaction DECIMAL(10,2) NOT NULL,
  unit_cost_at_transaction DECIMAL(10,2) NOT NULL,

  timestamp TIMESTAMP DEFAULT NOW(),
  logged_by_user_id UUID NOT NULL REFERENCES users(id),
  notes TEXT,

  -- Expiration tracking (NEW: per-batch expiration date)
  expiration_date DATE,  -- only for 'add' transactions on items with tracks_expiration=true

  -- Edit tracking (NEW: 5-minute edit window)
  edited_at TIMESTAMP,
  edited_by_user_id UUID REFERENCES users(id),
  original_business_entity VARCHAR(50),  -- preserved if edited

  -- Adjustment fields
  adjustment_reason VARCHAR(100),
  adjustment_notes TEXT,
  approved_by_user_id UUID REFERENCES users(id),
  approval_timestamp TIMESTAMP,
  rejection_reason TEXT,

  CONSTRAINT valid_business_entity CHECK (
    business_entity IN ('Business A', 'Business B')
  ),
  CONSTRAINT valid_transaction_type CHECK (
    transaction_type IN ('add', 'consume', 'adjust_pending',
                        'adjust_approved', 'adjust_rejected')
  ),
  -- Allow negative stock (conflict resolution decision)
  -- REMOVED: CONSTRAINT non_negative_stock_after
);
```

### Users Table (Updated)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,

  -- Two-tier auth (NEW)
  password_hash VARCHAR(255),  -- NULL for staff (PIN only)
  pin_hash VARCHAR(255),       -- NULL for owners (password only)
  auth_type VARCHAR(10) NOT NULL,  -- 'password' or 'pin'

  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT TRUE,  -- or must_change_pin for staff

  -- Notification preferences (NEW: email deferred but structure ready)
  notification_prefs JSONB DEFAULT '{"in_app": true}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  created_by_user_id UUID REFERENCES users(id),

  CONSTRAINT valid_role CHECK (role IN ('owner', 'staff')),
  CONSTRAINT valid_auth_type CHECK (auth_type IN ('password', 'pin')),
  CONSTRAINT owner_has_password CHECK (
    role != 'owner' OR password_hash IS NOT NULL
  ),
  CONSTRAINT staff_has_pin CHECK (
    role != 'staff' OR pin_hash IS NOT NULL
  )
);
```

### System Settings Table (Updated)
```sql
INSERT INTO system_settings (key, value, description) VALUES
  ('session_timeout_minutes', '90', 'Minutes of inactivity before auto-logout'),  -- Changed from 8 hours
  ('edit_window_minutes', '5', 'Minutes after submission that edits are allowed'),
  ('require_adjustment_notes', 'true', 'Force notes on all adjustments'),
  ('low_stock_threshold_percent', '20', 'Yellow warning threshold'),
  ('expiry_alert_days', '7', 'Days before expiration to show warnings'),  -- NEW: expiration tracking
  ('offline_sync_max_items', '20', 'Max pending items before forcing sync'),  -- Deferred
  ('offline_sync_max_hours', '4', 'Max hours before forcing sync');  -- Deferred
```

---

## Authentication Flow

### Staff Login (PIN-based)
```
1. Enter email address
2. Enter 4-6 digit PIN
3. System validates PIN hash
4. Create JWT session (90-minute expiry)
5. If must_change_pin, force PIN change screen
```

### Owner Login (Password-based)
```
1. Enter email address
2. Enter password
3. System validates password hash (bcrypt)
4. Create JWT session (90-minute expiry)
5. If must_change_password, force password change screen
```

### Session Management
- JWT stored in HTTP-only cookie
- 90-minute inactivity timeout (configurable)
- Refresh on activity
- No "remember me" for security

---

## UI/UX Specifications

### Transaction Entry Form
```
┌─────────────────────────────────────┐
│ Log Stock Transaction               │
├─────────────────────────────────────┤
│ Item *                              │
│ [Search items...               ▼]  │
│ Quick picks: [Top 5 by category]   │
│                                     │
│ Quantity *                          │
│ [   -   ] [     10     ] [   +   ] │
│ (stepper or direct input)           │
│                                     │
│ Business Brand *                    │
│ ┌─────────────────────────────────┐ │
│ │ 💡 Last used: Business A   │ │  ← Smart suggestion (no pre-select)
│ │                                 │ │
│ │ ○ Business A  (blue)       │ │
│ │ ○ Business B (orange)    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Type: ○ Add Stock  ● Consume        │
│                                     │
│ Expiration Date *                   │  ← Only shown when item has
│ [  Select date...            📅 ]  │    tracks_expiration=true AND
│ Required for this item              │    type is "Add Stock"
│                                     │
│ Notes (optional)                    │
│ [                                 ] │
│                                     │
│ [Cancel]        [Submit Transaction]│
└─────────────────────────────────────┘
```

### Confirmation Modal
```
┌────────────────────────────────────┐
│ ✓ Confirm Transaction              │
├────────────────────────────────────┤
│                                    │
│ ┌────────────────────────────────┐ │
│ │    🔵 ARCY'S KITCHEN          │ │  ← Full-width color banner
│ └────────────────────────────────┘ │
│                                    │
│ Item: Alaska All Purpose Cream     │
│ Action: Consume 5 pieces           │
│ Expires: Jan 15, 2026              │  ← Only shown if expiration date set
│ New stock: 75 pieces               │
│                                    │
│ ⚠ This batch expires in 5 days     │  ← Yellow warning if within threshold
│                                    │
│ [Go Back]      [Confirm & Submit]  │
└────────────────────────────────────┘
```

### Dashboard - Expiring Soon Section
```
┌─────────────────────────────────────┐
│ ⚠ Expiring Soon (3 items)    [▼]  │  ← Collapsible, between summary bar and item grid
├─────────────────────────────────────┤
│ 🔴 Alaska Cream — EXPIRED Jan 10   │  ← Red: already expired
│    85 pcs remaining                 │
│    [Submit Adjustment]              │  ← Links to /adjustments/new?itemId=...&reason=Expired
│                                     │
│ 🟡 Fresh Milk — Expires Jan 18     │  ← Amber: within threshold
│    20 liters remaining • Use first  │
│                                     │
│ 🟡 Eggs — Expires Jan 20           │
│    30 pieces remaining • Use first  │
└─────────────────────────────────────┘
```

- Shows items with batches expiring within `expiry_alert_days` threshold or already expired
- Sorted: expired first, then by soonest expiry date
- Only shows for active items with `tracks_expiration=true` and stock > 0
- Red entries for expired, amber for expiring soon
- "Submit Adjustment" links pre-populate the adjustment form with item and "Expired" reason

### Dashboard - Inactive Items Section
```
┌─────────────────────────────────────┐
│ Inactive Items (3)            [▼]  │
├─────────────────────────────────────┤
│ Items that are no longer stocked.  │
│ Click to view or reactivate.       │
│                                     │
│ • Discontinued Sauce A             │
│ • Old Packaging B                  │
│ • Seasonal Item C                  │
└─────────────────────────────────────┘
```

### 5-Minute Edit Window
```
After submission, transaction card shows:
┌─────────────────────────────────────┐
│ ✓ Transaction Logged               │
│                                     │
│ 🔵 Business A                  │
│ Alaska Cream - Consumed            │
│ -5 pieces → Stock: 75              │
│ Expires: Jan 15, 2026              │  ← Only shown if expiration date set
│                                     │
│ [Edit] (4:32 remaining)            │  ← Countdown timer
│                                     │
└─────────────────────────────────────┘
```

---

## Business Logic Rules

### Stock Calculation (Allow Negative)
```javascript
// When syncing or processing transactions:
const newStock = currentStock + quantityChange;

// Allow negative (per interview decision)
if (newStock < 0) {
  // Log the transaction anyway
  await createTransaction({ ... });

  // Create alert for owners
  await createAlert({
    type: 'negative_stock',
    item_id: itemId,
    message: `Stock went negative: ${newStock} ${unit}`,
    severity: 'critical'
  });
}
```

### Transaction Edit Window
```javascript
const EDIT_WINDOW_MINUTES = 5;

function canEditTransaction(transaction, currentUser) {
  const minutesSinceCreation =
    (Date.now() - transaction.timestamp) / 60000;

  return (
    minutesSinceCreation <= EDIT_WINDOW_MINUTES &&
    transaction.logged_by_user_id === currentUser.id &&
    transaction.transaction_type !== 'adjust_approved'
  );
}
```

### Expiration Date Validation (Conditional)
```javascript
// When creating a transaction:
async function validateExpirationDate(transaction, item) {
  // Only required for "add" transactions on items with tracks_expiration=true
  if (item.tracks_expiration && transaction.transaction_type === 'add') {
    if (!transaction.expiration_date) {
      throw new Error('Expiration date is required for this item');
    }
    if (transaction.expiration_date < today()) {
      throw new Error('Expiration date cannot be in the past');
    }
  }

  // Ignore expiration_date for non-add transactions or non-tracking items
  if (!item.tracks_expiration || transaction.transaction_type !== 'add') {
    transaction.expiration_date = null;
  }
}
```

### Expiration Alert Logic (Daily Cron)
```javascript
// Runs daily at 6 AM via Vercel Cron (/api/cron/expiration-check)
async function checkExpirations() {
  const thresholdDays = await getSetting('expiry_alert_days'); // default: 7
  const thresholdDate = addDays(new Date(), thresholdDays);

  // Find items with earliest expiring batch within threshold
  const expiringItems = await db.items.findMany({
    where: {
      tracks_expiration: true,
      is_active: true,
      quantity_in_stock: { gt: 0 },
      transactions: {
        some: {
          transaction_type: 'add',
          expiration_date: { lte: thresholdDate, not: null }
        }
      }
    }
  });

  for (const item of expiringItems) {
    const earliestBatch = getEarliestExpiringBatch(item);
    const isExpired = earliestBatch.expiration_date < today();

    await createNotification({
      type: isExpired ? 'expired' : 'expiring_soon',
      item_id: item.id,
      message: isExpired
        ? `${item.description} has expired stock (expired ${formatDate(earliestBatch.expiration_date)})`
        : `${item.description} expires in ${daysUntil(earliestBatch.expiration_date)} days`,
      severity: isExpired ? 'critical' : 'warning'
    });
  }
}
```

### Category-Based Quick Picks
```javascript
async function getQuickPicks(categoryId) {
  // Get top 5 most-used items in this category
  // Based on transaction count in last 30 days
  return await db.items.findMany({
    where: {
      category_id: categoryId,
      is_active: true
    },
    orderBy: {
      transactions: {
        _count: 'desc'
      }
    },
    take: 5
  });
}
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Email + PIN/Password login
- `POST /api/auth/logout` - Clear session
- `POST /api/auth/change-pin` - Staff PIN change
- `POST /api/auth/change-password` - Owner password change
- `GET /api/auth/session` - Validate current session

### Items
- `GET /api/items` - List all items (with filters); includes computed `earliestExpiry` and `expiryStatus` for items with `tracks_expiration=true`
- `GET /api/items/:id` - Get item details
- `GET /api/items/expiring` - List items with expiring/expired batches (within `expiry_alert_days` threshold)
- `POST /api/items` - Create item (owner only); includes `tracks_expiration` boolean
- `PUT /api/items/:id` - Update item (owner only); includes `tracks_expiration` boolean
- `PUT /api/items/:id/price` - Update price (owner only)
- `PUT /api/items/:id/deactivate` - Deactivate item (owner only)
- `PUT /api/items/:id/activate` - Reactivate item (owner only)

### Transactions
- `GET /api/transactions` - List transactions (with filters); includes `expiration_date` when present
- `POST /api/transactions` - Create transaction; conditionally requires `expiration_date` for "add" on items with `tracks_expiration=true`
- `PUT /api/transactions/:id` - Edit transaction (5-min window); `expiration_date` is editable
- `GET /api/transactions/:id` - Get transaction details

### Adjustments
- `GET /api/adjustments/pending` - List pending adjustments
- `POST /api/adjustments/:id/approve` - Approve (owner only)
- `POST /api/adjustments/:id/reject` - Reject (owner only)

### Reports
- `GET /api/reports/consumption` - Business consumption report
- `GET /api/reports/low-stock` - Low stock items
- `GET /api/reports/export` - CSV export

### Notifications
- `GET /api/notifications` - List user's notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `GET /api/notifications/count` - Unread count

### Scheduled Jobs
- `GET /api/cron/expiration-check` - Daily cron (6 AM UTC via Vercel Cron); checks all items with `tracks_expiration=true` and creates `expiring_soon`/`expired` notifications. Deduplicates (skips if notification exists for same item in last 24h). Requires `CRON_SECRET` bearer token.

---

## Technical Stack (Finalized)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query + React Context
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

### Backend
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL 15+ on Railway
- **ORM**: Prisma
- **Auth**: JWT in HTTP-only cookies, bcrypt for passwords

### Infrastructure
- **Hosting**: Vercel
- **Database**: Railway PostgreSQL
- **Monitoring**: Vercel Analytics
- **Cost**: ~$10-15/month

---

## Version Control

**Strategy:** Single-branch workflow on `main`

- All development work is committed directly to the `main` branch
- Feature branches are used only for risky or experimental changes, then merged back into `main`
- Commits should be small and focused — one logical change per commit
- Commit messages should be short and descriptive (e.g. "Add transaction entry form with Zod validation")
- Push to GitHub regularly to maintain a remote backup
- A `.gitignore` is configured to exclude `node_modules/`, `.env.local`, `.next/`, and other generated/sensitive files

---

## Revised Timeline (6 Weeks)

### Week 1: Foundation
- Next.js + Railway PostgreSQL + Prisma setup
- Database schema implementation
- Two-tier auth (PIN for staff, password for owners)
- Basic layout and navigation

**Deliverable**: Working auth, user management

### Week 2: Core Inventory
- Categories and seed data
- Item CRUD (with `is_active`, `allows_decimal`, `tracks_expiration`)
- Dashboard with card layout
- Status indicators, business badges, and expiration indicators
- Dashboard "Expiring Soon" collapsible section
- Search, filtering, sorting

**Deliverable**: Complete item management, functional dashboard with expiry alerts

### Week 3: Transactions
- Transaction entry form (no quick actions, always ask quantity)
- Conditional expiration date picker (required for tracked items on "Add Stock")
- Smart business suggestion (last-used, no pre-select)
- Business selection validation
- Confirmation modal (with expiry info and near-expiry warning)
- 5-minute edit window (expiration date editable)
- Transaction history with filters (expiry dates color-coded)

**Deliverable**: Full transaction logging with business tagging and expiration tracking

### Week 4: Adjustments & Reports
- Adjustment submission form (pre-populated from expiring items link)
- Pending adjustments queue
- Approve/reject workflow
- In-app notifications (bell icon, badges, expiring_soon/expired types)
- Daily expiration check cron job (Vercel Cron)
- Consumption report with charts
- Expiring items tab in low stock report
- CSV export

**Deliverable**: Complete adjustment workflow, reporting, expiration alerts

### Week 5: Polish & Testing
- Responsive mobile optimization
- Basic web manifest (Add to Home Screen)
- Unit tests for business logic
- Integration tests for critical paths
- E2E tests for key workflows
- Bug fixes

**Deliverable**: Polished, tested application

### Week 6: Migration & Launch
- Export Google Sheet data
- Physical inventory count
- Data migration (current stock only)
- User account creation
- Owner training (2 hours)
- Staff training (quick start guide)
- Production deployment
- Daily check-ins (first 3 days)

**Deliverable**: Live system in production

---

## Testing Strategy

### Unit Tests (Priority)
- Stock calculation logic
- Edit window validation
- Permission checks (owner vs staff)
- Business entity validation
- Decimal quantity validation
- Expiration date conditional validation (required when `tracks_expiration` + "add")
- Expiry status calculation (ok / expiring_soon / expired)
- Notification deduplication (no duplicate alerts within 24h)

### Integration Tests
- Auth flow (PIN and password)
- Transaction → stock update
- Adjustment approval flow
- Price update → value recalculation
- Add transaction with expiration date → expiring items endpoint returns it
- Add transaction without expiration date on tracked item → 400 error
- Cron expiration check → creates notifications

### E2E Tests
- Staff logs transaction flow
- Staff adds stock with expiration date for tracked item
- Owner approves expired item adjustment flow
- Dashboard shows expiring soon section with correct color coding
- Dashboard filtering
- Report generation and export

---

## Verification Checklist

### Pre-Launch
- [ ] All users can log in (PIN for staff, password for owners)
- [ ] Dashboard loads in <2 seconds with 95 items
- [ ] Transaction logging works with business selection required
- [ ] Expiration date required on "Add Stock" for tracked items, hidden for non-tracked
- [ ] Dashboard "Expiring Soon" section shows correct items with color coding
- [ ] Daily expiration cron job creates notifications correctly
- [ ] Adjustment approval workflow complete
- [ ] Expired item adjustment flow works (pre-populated from dashboard link)
- [ ] Consumption report generates correctly
- [ ] Expiring items tab shows in low stock report
- [ ] CSV export produces valid data
- [ ] Mobile responsive on actual devices
- [ ] Add to Home Screen works (iOS Safari, Android Chrome)

### Post-Launch (Day 1-3)
- [ ] All staff have accounts and can log in
- [ ] Initial stock levels match physical count
- [ ] No critical bugs blocking operations
- [ ] Owners receiving in-app notifications
- [ ] Reports matching manual calculations

---

## Open Questions (None Remaining)

All questions resolved through interview process.

---

## Document History
- **v1.0**: Original PRD review
- **v2.0**: Interview decisions incorporated
- **v2.1**: MVP scope simplified (cut offline/PWA, email)
- **v2.2**: Added expiration date tracking feature (per-batch, optional per item, FIFO visual guidance, 7-day alert threshold, daily cron alerts)
- **Final**: Ready for implementation
