# Rajalakshmy Associates – Corporate CRM Prototype

A modern, interactive, fully responsive corporate CRM prototype built for **Rajalakshmy Associates** using **React.js**, **Vite**, and **Tailwind CSS**.

---

## 🏛️ Brand & Design Guidelines

- **Primary Burgundy**: `#79091D`
- **Dark Wine**: `#600516`
- **Gold Accent**: `#D9A52E`
- **Background**: `#FAF6EF`
- **Cards**: `#FFFFFF`
- **Text**: Dark Charcoal
- **Branding**: Official corporate logo integrated in header, navigation, and login.

---

## 🚀 Key Modules & Implemented Features

### 1. 🔐 Role-Based Authentication & Instant Follow-up Popup
- **5 Roles & Sample Credentials**:
  - **Admin**: `EMP001` (Rajesh Kannan, Managing Director & Principal Partner)
  - **Manager**: `EMP002` (Priya Swaminathan, General Operations Manager)
  - **Ops**: `EMP003` (Karthik Sundaram, CRM Database & Ops Executive)
  - **RM**: `EMP004` (Ananya Subramanian, Senior Relationship Manager)
  - **Sales Manager**: `EMP005` (Murugan Velu, Field Sales Manager)
  - Password for all accounts: `password123` (or click any of the **1-Click Quick Role Switch** buttons on the login screen!)
- **Follow-up Trigger on Login**:
  - Automatically checks if the user has pending follow-up calls.
  - Pops up the **Pending Follow-up Action Required** modal.
  - Allows completing the call, marking OK, or rescheduling the follow-up date directly in the popup before entering the main dashboard.
- **Route Guarding**: Unauthorized URLs are prevented and safely redirected with access alerts.

### 2. 📊 Executive Dashboard
- **10 Core KPI Cards**:
  - Total Customers
  - Old Known Customers
  - Old Unknown Customers
  - New Known Customers
  - New Unknown Customers
  - Total Calls
  - Today's Calls
  - Pending Follow-ups
  - Total Cases Filed
  - Approved Cases (with sanctioned portfolio value)
- **Interactive Charts (Recharts)**:
  - Daily Telecalling Volume & Conversions (Bar chart)
  - Customer Database Breakdown: Known vs. Unknown & Old vs. New (Donut chart)
  - Monthly Performance & Case Volume Growth in Lakhs (Area chart)
- **Live Widgets**:
  - Pending follow-up queue with quick call trigger
  - Recent field activities and lead submissions

### 3. 📞 Relationship Manager (RM) – Telecalling Console
- **Focused Calling View**:
  - Displays assigned contacts one at a time with queue navigation (Previous / Next).
  - Displays customer name, phone, trade/occupation, location, and past discussion history.
  - **"Initiate Call Session"**: Simulates active telephone call with a live duration timer (`00:01`, `00:02`...) and animated voice waveform.
- **4 Mandatory Call Outcomes**:
  1. `OK` – Converted / interested lead
  2. `Not Attend` – Ringing / busy / switched off
  3. `No Need` – Not interested / DND
  4. `Reminder` – Pops up date picker and remark input, saves reminder against the contact, and adds to follow-up schedule.
- **Calling Reports & Audits**:
  - Filter by Today, Month, or Custom Date Range.
  - Outcome breakdown pie chart and count metrics.
  - Detailed calling audit table with export to CSV.

### 4. 🗃️ Customer Database (Old & New / Known & Unknown)
- Separate dedicated sections for:
  - `Old Database – Known`
  - `Old Database – Unknown`
  - `New Database – Known`
  - `New Database – Unknown`
- **Fields**:
  - Known: Customer Name, Mobile Number, Alternate Mobile, Business/Occupation, Address, State, City.
  - Unknown: Mobile Number, State, Business Descriptor.
- **Features**:
  - Universal search by customer name, mobile, and business.
  - Filters by State (Tamil Nadu / Puducherry), Calling Status, Source, and Creation Date.
  - Pagination and CSV Export.
  - **KYC Document Management**:
    - Categories: `KYC 1` (Aadhaar / ID), `KYC 2` (PAN Card), `KYC 3` (GST / Registration), `Other Documents`.
    - Upload documents, preview, and remove files.
  - **Service History Timeline**:
    - Multi-service tracking per customer (Service Name, Request Date, Details, Status, Remarks).
    - Timeline view of all historical consultations and loans.

### 5. 📝 Daily Activities – Field Sales & Excel Bulk Upload
- **Daily Field Submission Form**:
  - Customer Name, Mobile Number, Business/Occupation, Known/Unknown toggle, State.
  - Database Source: `Bills`, `Open Source`, `Reference`.
  - Conditional field: *"Reference From / Who?"* dynamically rendered when `Reference` is selected.
  - Automatically classifies into `New Database – Known` or `New Database – Unknown`.
- **Excel Bulk Upload (`.xlsx` / `.xls`)**:
  - Drag-and-drop or select any `.xlsx` / `.xls` or CSV file.
  - Downloadable Sample Excel Template provided inside the app for instant testing.
  - Live preview table before committing.
  - 10-digit mobile number format validation.
  - **Duplicate Detection**: Cross-references against all existing records in the database.
  - Summary metrics: Total rows, Valid new records, Duplicates skipped, and Invalid numbers.
  - Saves valid unique records directly to the New Database.
- **Activity Reports**:
  - Today's entries, monthly count, employee-wise filter, and source distribution.

### 6. 🏆 Performance – Case Disposition & Approval Console
- Submit financial case dispositions (Customer Name, Mobile, Amount in ₹, Date, Details).
- Initial status: `Pending Approval`.
- **Admin & Manager Approval Pipeline**:
  - **Approve**: Sets green `Approved` badge, records approver's name and approval date, and updates the sanctioned performance total.
  - **Reject**: Opens modal to enter rejection reasons, sets red `Rejected` badge, and preserves rejection remarks.

### 7. 📄 Resignation & Advance Amount Modules
- **Resignation Management**:
  - Submit resignation notice (Last working date, reason).
  - Status tracking: Pending, Approved, Rejected.
- **Advance Amount Management**:
  - Requisition form for salary advance in ₹.
  - Status tracking with approval actions for Admin and Managers.

### 8. ⚙️ Operations Settings & RM Lead Distribution
- **Ops Lead Distribution Engine**:
  - Select target RM and batch size (3, 5, 10, 20 contacts).
  - Automatically allocates unassigned/pending contacts from Old or New Database to the designated RM.
- **Authorized Personnel Directory**:
  - Complete profiles of 20 realistic employees across Tamil Nadu and Puducherry branch locations.
- **Reset Prototype Data**:
  - One-click restore to original factory mock data.

---

## 🛠️ Installation & Running Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Step 3: Build for Production
```bash
npm run build
npm run preview
```

---

## 📂 Project Directory Structure

```
rajalakshmy-associates-crm/
├── public/
│   └── logo.png                          # Official Rajalakshmy Associates Logo
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── FollowUpReminderModal.jsx # Auto-popup on login for pending follow-ups
│   │   │   ├── Navbar.jsx                # Universal search, role switcher, follow-up badge
│   │   │   ├── Sidebar.jsx               # Collapsible corporate sidebar with role menus
│   │   │   └── Toast.jsx                 # System notifications
│   │   ├── customers/
│   │   │   ├── AddCustomerModal.jsx      # Customer creation with KYC document uploads
│   │   │   └── CustomerDetailModal.jsx   # Profile, KYC 1-3 docs, and Service History
│   │   ├── dailyActivities/
│   │   │   ├── DailyActivityForm.jsx     # Field sales lead submission
│   │   │   └── ExcelBulkUploader.jsx     # .xlsx parsing, duplicate detection, and import
│   │   ├── performance/
│   │   │   ├── CaseSubmissionModal.jsx   # Case disposition entry
│   │   │   └── RejectCaseModal.jsx       # Rejection reason modal
│   │   └── telecalling/
│   │       └── ActiveCallModal.jsx       # Live call simulation, duration timer & outcomes
│   ├── context/
│   │   ├── AuthContext.jsx               # Authentication, user roles, and permissions
│   │   └── CRMContext.jsx                # Centralized state & LocalStorage persistence
│   ├── data/
│   │   └── mockData.js                   # 20 employees, 50+ customers, calls, and cases
│   ├── pages/
│   │   ├── AdvanceAmountPage.jsx         # Salary advances
│   │   ├── CustomerDatabasePage.jsx      # Old/New & Known/Unknown database partitions
│   │   ├── DailyActivitiesPage.jsx       # Field activities & Excel bulk upload
│   │   ├── DashboardPage.jsx             # 10 KPI cards and Recharts analytics
│   │   ├── LoginPage.jsx                 # Role login & quick test switcher
│   │   ├── PerformancePage.jsx           # Case disposition & approval pipeline
│   │   ├── ReportsPage.jsx               # Comprehensive reports & leaderboard
│   │   ├── ResignationPage.jsx           # Resignation workflows
│   │   ├── SettingsPage.jsx              # Ops lead distributor & employee directory
│   │   └── TelecallingPage.jsx           # RM focused telecalling & calling queue
│   ├── utils/
│   │   └── formatters.js                 # INR currency, dates, and CSV export helpers
│   ├── App.jsx                           # Protected routing & layout
│   ├── index.css                         # Tailwind CSS and animations
│   └── main.jsx                          # React application entry
├── index.html
├── package.json
├── tailwind.config.js                    # Custom Burgundy & Gold corporate palette
└── vite.config.js
```

---

## 🧑‍💼 Test Login Accounts

| Role | Employee ID | Name | Department | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `EMP001` | Rajesh Kannan | Executive Management | Full system access, case approval, user settings |
| **Manager** | `EMP002` | Priya Swaminathan | Branch Operations | Review team performance, approve cases & advances |
| **Ops** | `EMP003` | Karthik Sundaram | CRM Operations | Manage database, distribute contacts to RMs |
| **RM** | `EMP004` | Ananya Subramanian | Client Telecalling | Assigned calling queue, call simulator, follow-ups |
| **Sales Manager** | `EMP005` | Murugan Velu | Business Development | Field sales tracking, daily activities & Excel import |

*Password: `password123` (or use the one-click quick switch buttons on the login screen).*

---

© Rajalakshmy Associates. Corporate Financial Advisory & Field CRM Platform.
