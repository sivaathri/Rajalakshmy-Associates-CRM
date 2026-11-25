# Rajalakshmy Associates – Corporate CRM Platform

A modern, high-performance, unified financial CRM platform built for **Rajalakshmy Associates**. Operates seamlessly both as an **Executive Web Application** and as a **Standalone Native Windows Desktop Application (Electron)** from a single, unified codebase.

---

## 🚀 Running Modes & Execution Commands

### Quick Commands Summary

| Mode | Command | Description |
| :--- | :--- | :--- |
| **🌐 Web App (Browser)** | `npm run web` *(or `npm run dev`)* | Starts Vite development server and opens the application in your default web browser (`http://localhost:5173`). |
| **💻 Standalone Desktop App** | `npm run app` *(or `npm run electron:dev`)* | Launches the application as a standalone native Windows desktop software window powered by Electron. |
| **📦 Build Web (Production)** | `npm run build` | Compiles production web bundle into the `dist/` directory. |
| **💿 Generate Desktop Installer (.exe)** | `npm run app:dist` *(or `npm run electron:build`)* | Automatically compiles and packages the complete standalone Windows `.exe` installer setup in the `release/` folder. |

---

## 💿 Generating the Standalone Windows `.exe` Installer

To generate the standalone Windows installer executable file for your client:

```bash
npm run app:dist
```
*(Alternative alias: `npm run electron:build`)*

### What This Command Does:
1. Compiles the frontend assets via Vite into `dist/`.
2. Packages the Electron runtime, application logic, and the official **Rajalakshmy Associates logo**.
3. Generates the distribution installer setup inside the **`release/`** directory:
   * **Installer File**: `release/Rajalakshmy Associates CRM Setup 1.0.0.exe`
4. **Client Distribution**: Deliver this `.exe` file to the client. When double-clicked, it installs the desktop software and creates a **Desktop Shortcut** with your logo.

---

## 🛠️ How to Open Developer Tools in Standalone Mode

While running the standalone desktop application, Developer Tools and hot-reload can be accessed at any time:

### 1. Keyboard Shortcuts
- **`F12`** — Toggles Developer Tools open and closed.
- **`Ctrl + Shift + I`** *(or `Cmd + Option + I` on macOS)* — Toggles Developer Tools.
- **`F5`** or **`Ctrl + R`** — Quickly reloads the desktop application.

### 2. Auto-Open on Startup (Optional)
To have Developer Tools open automatically every time you run `npm run app`, open [electron/main.js](file:///electron/main.js) and uncomment line 57:
```javascript
if (isDev) {
  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools(); // <-- Uncomment this line
}
```

---

## 🔄 How the Automatic Update Works

The standalone desktop application includes an integrated automatic background updater powered by **`electron-updater`**. Once you give the client the `.exe`, any future updates pushed to Git can be automatically detected and installed on all client PCs without manual reinstallations.

### ❓ Does `npx electron-builder --publish always` update ALL machines?
**YES! Absolutely.**
- Every single machine (whether 1, 10, or 100+ employee PCs) that has your CRM installed will automatically check your GitHub repository.
- As soon as you publish a new version, **every client computer will receive and prompt for the update automatically**.
- **What if a client PC is offline?** No problem. As soon as the machine connects to the internet and opens the CRM, it immediately detects the update and downloads it.
- **Is client data safe?** **100% Yes.** All client database records, leads, telecalling logs, and settings stored in LocalStorage are preserved safely across all updates.

---

### The Automatic Update Lifecycle

```
[1. Developer pushes updates & bumps version in package.json] 
                              │
                              ▼
        [2. Developer runs: npx electron-builder --publish always]
                              │
                              ▼
            [3. Release published to GitHub repository]
                              │
                              ▼
      [4. Every Client opens desktop software on their PC]
                              │
                              ▼
        [5. App checks GitHub Releases in the background]
                              │
                              ▼
          [6. Dialog: "New Update v1.0.1 Available"]
                              │
                              ▼
        [7. Background download finishes & prompts client:]
          "Update Ready! Restart now to install?"
                              │
                              ▼
   [8. Client clicks Restart -> Installs & opens updated CRM!]
```

---

### 🔑 One-Time Developer Setup (GitHub Token)

To allow `electron-builder` to automatically upload releases to your GitHub repository from your terminal, configure your **GitHub Personal Access Token (`GH_TOKEN`)** once on your computer:

1. Go to GitHub: **Settings** -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
   *(Direct URL: https://github.com/settings/tokens)*
2. Click **Generate new token (classic)**.
3. Name it (e.g., `CRM-Releases`) and check the **`repo`** scope (full control of private repositories).
4. Copy the generated token (starts with `ghp_...`).
5. Configure your token using either method:
   - **Method A (Easiest — inside `.env` file)**:
     Open [.env](file:///.env) and paste your token:
     ```env
     GH_TOKEN=ghp_your_actual_token_here
     ```
   - **Method B (Via Terminal)**:
     - **In PowerShell**:
       ```powershell
       $env:GH_TOKEN="ghp_your_actual_token_here"
       ```
     - **In Command Prompt (CMD)**:
       ```cmd
       set GH_TOKEN=ghp_your_actual_token_here
       ```
   *(Tip: To set it permanently on Windows, search "Environment Variables" in Windows Start menu and add a user variable `GH_TOKEN` with your token value).*

---

### 🚀 Complete Developer Step-by-Step for Future Client Updates:

Whenever the client asks for new features or bug fixes, follow these simple steps:

1. **Make code changes** requested by the client and test locally:
   ```bash
   npm run dev      # or npm run app
   ```
2. **Bump the version** in `package.json`:
   ```json
   "version": "1.0.1"   // (change from 1.0.0 to 1.0.1, 1.0.2, etc.)
   ```
3. **Commit & Push code to Git**:
   ```bash
   git add .
   git commit -m "Added new features v1.0.1"
   git push
   ```
4. **Publish the Release to All Client Machines**:
   ```powershell
   $env:GH_TOKEN="your_token_here"       # (if not set permanently)
   npx electron-builder --publish always
   ```
5. **What happens on all Client PCs**:
   * Next time employees launch the desktop app, they receive a notification:
     > *"New Update Available: Version 1.0.1 is available and is downloading in the background."*
   * Once the download finishes, a dialog appears:
     > *"Update Ready: Version 1.0.1 has been downloaded. Restart the application now to apply the updates?"*
     > `[Restart & Install Now]` | `[Later]`
   * When they click **Restart & Install Now**, the CRM restarts updated to `v1.0.1` in seconds, keeping all existing leads and data intact!

---

### 🔧 Current GitHub Configuration & How to Change It in Future:
- **Repository**: [https://github.com/sivaathri/Rajalakshmy-Associates-CRM.git](https://github.com/sivaathri/Rajalakshmy-Associates-CRM.git)
- **Account**: `sivaathri`

If your GitHub username or account changes in the future, simply update these 2 places in [package.json](file:///package.json):
1. **Repository URL**:
   ```json
   "repository": {
     "type": "git",
     "url": "https://github.com/YOUR_NEW_USERNAME/YOUR_NEW_REPO.git"
   }
   ```
2. **Publish Block** (under `"build"`):
   ```json
   "publish": [
     {
       "provider": "github",
       "owner": "YOUR_NEW_USERNAME",
       "repo": "YOUR_NEW_REPO"
     }
   ]
   ```
3. **Update Git Remote**:
   ```bash
   git remote set-url origin https://github.com/YOUR_NEW_USERNAME/YOUR_NEW_REPO.git
   ```

---

## 🏛️ Brand & Design Guidelines

- **Primary Burgundy**: `#79091D`
- **Dark Wine**: `#600516`
- **Gold Accent**: `#D9A52E`
- **Background**: `#FAF6EF`
- **Cards**: `#FFFFFF`
- **Text**: Dark Charcoal
- **Branding**: Official corporate logo integrated in desktop title bar, taskbar, web header, navigation, and login.

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
- **10 Core KPI Cards**: Total Customers, Old/New Database counts, Total Calls, Today's Calls, Pending Follow-ups, Total Cases Filed, Approved Cases with portfolio volume.
- **Interactive Charts (Recharts)**: Daily Telecalling Volume & Conversions, Customer Database Breakdown, Monthly Performance Growth in Lakhs.
- **Strict DD-MM-YYYY Date Format**: All timestamps, punch records, and logs are displayed in corporate `DD-MM-YYYY` standard.

### 3. 🎯 Sales Leads Pipeline & Auto-Conversion
- **Automatic Conversion from Telecalling**: When any telecaller marks a call outcome as **1. OK** or **5. Field Visit**, the number is automatically converted into a Lead and assigned strictly to that user.
- **User Ownership & Visibility Isolation**: Leads actioned from calls are scoped so that only the user who actioned that number sees it. Other users cannot access or view that lead.
- **Assign Lead Logic**: The "Assign Lead" button is only displayed for unassigned leads; already assigned leads hide the button.
- **Eye Icon & Edit Modal**: Eye icon opens the full Lead details with a direct **Edit Lead** modal.

### 4. 🏦 Bank Login & Disbursement Console
- **Two-Day Reminder System**: Automatically alerts every 2 days if a bank appraisal file has not received progress notes.
- **Customer ID Auto-Generation**: Converting a lead to bank login automatically generates a unique `RA-CUST-XXXX` Customer ID (no login IDs generated).
- **Disbursement & Rejection Flow**:
  - **Disburse**: Prompts for bank name, loan amount, and loan type to record sanctioned funds.
  - **Reject**: Captures mandatory managerial decline remarks.
- **Audit History**: Eye icon displays the complete chronological update timeline.

### 5. ⏱️ Attendance & Leave Management Desk
- **Dual Tab Architecture**:
  - **Daily In-Punch & History** (`History` icon): One-click daily in-time punch, live digital clock, and audit history table in `DD-MM-YYYY`.
  - **Leave Management & Approvals** (`CalendarCheck` icon): Full leave requisition workflow.
- **Request Leave**: Allows employees to select leave type (CL, SL, PL, Emergency, etc.), date range, days count, and reason. Submits as `Pending Approval`.
- **Admin Approval Console**: Shows who raised each leave (Name, ID, Role), date range, and reason, with one-click **Approve** and **Reject with Remarks** actions.

### 6. 📞 Relationship Manager (RM) – Telecalling Console
- **Focused Calling View**: One-by-one contact navigation with active duration timer and call simulation.
- **5 Mandatory Call Outcomes**: `1. OK`, `2. Not Attend`, `3. No Need`, `4. Reminder`, `5. Field Visit`.
- **Calling Reports**: Filter by Today, Month, or Custom Date Range with CSV export.

### 7. 🗃️ Customer Database (Old & New / Known & Unknown)
- Dedicated views for `Old Database – Known`, `Old Database – Unknown`, `New Database – Known`, and `New Database – Unknown`.
- **Role Scoping**: RMs can add records in database menus with auto-generated `RA-CUST-` IDs.
- **KYC Document Vault**: Category-based file attachment (`KYC 1`, `KYC 2`, `KYC 3`, `Other`).
- **Service History Timeline**: Multi-service tracking per customer.

### 8. 📝 Daily Activities – Field Sales & Excel Bulk Upload
- Daily field submission form with database source selection (`Bills`, `Open Source`, `Reference`).
- **Open Source Bulk Upload**: Excel bulk upload option (`.xlsx` / `.xls` / `.csv`) for batch customer registration with duplicate detection.

### 9. 🏆 Performance, Resignations & Advances
- **Performance Case Dispositions**: Submit case values with Admin/Manager approval workflow.
- **Salary Advances**: Requisition form with real-time status tracking.
- **Resignation Notices**: Managerial review and approval tracking.

### 10. 👥 User Management & Access Control
- Dedicated sidebar item **User Management** with staff counter badge.
- **Add New User**: Create personnel with auto-generated sequential Employee IDs (`EMP006`, etc.), Role, Designation, Department, Branch, Email, Phone, and Password.
- **LocalStorage Persistence**: Newly registered accounts are stored securely and can immediately log in on the Login Screen.
- **Edit & Status Controls**: Edit staff details, toggle Active/Inactive status, and remove accounts (with protection for Principal Admin).
- **1-Click Session Switcher**: Quickly switch into any user's perspective directly from the console to verify their role view.

---

## 📂 Project Directory Structure

```
rajalakshmy-associates-crm/
├── electron/
│   ├── main.js                           # Electron main process (window, shortcuts, auto-updater)
│   └── preload.js                        # Context isolation bridge
├── public/
│   └── logo.png                          # Official Rajalakshmy Associates Logo
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── FollowUpReminderModal.jsx # Auto-popup on login for pending follow-ups
│   │   │   ├── Navbar.jsx                # Universal search, role switcher, follow-up badge
│   │   │   ├── Sidebar.jsx               # Corporate navigation sidebar with role guards
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
│   │   └── mockData.js                   # Employee credentials & default structures
│   ├── pages/
│   │   ├── AdvanceAmountPage.jsx         # Salary advances
│   │   ├── AttendancePage.jsx            # Daily In-Punch & Leave Management
│   │   ├── BankLoginPage.jsx             # Bank appraisal logins & disbursements
│   │   ├── CustomerDatabasePage.jsx      # Old/New & Known/Unknown database partitions
│   │   ├── DailyActivitiesPage.jsx       # Field activities & Excel bulk upload
│   │   ├── DashboardPage.jsx             # 10 KPI cards and Recharts analytics
│   │   ├── LeadsPage.jsx                 # Sales leads pipeline & assignments
│   │   ├── LoginPage.jsx                 # Role login & quick test switcher
│   │   ├── PerformancePage.jsx           # Case disposition & approval pipeline
│   │   ├── ReportsPage.jsx               # Comprehensive reports & leaderboard
│   │   ├── ResignationPage.jsx           # Resignation workflows
│   │   ├── SettingsPage.jsx              # Ops lead distributor & employee directory
│   │   └── TelecallingPage.jsx           # RM focused telecalling & calling queue
│   ├── utils/
│   │   └── formatters.js                 # INR currency, strict DD-MM-YYYY dates, CSV helpers
│   ├── App.jsx                           # Protected hash routing & layout
│   ├── index.css                         # Tailwind CSS and corporate theme
│   └── main.jsx                          # React application entry
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🧑‍💼 Test Login Accounts

| Role | Employee ID | Name | Department | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `EMP001` | Rajesh Kannan | Executive Management | Full system access, approvals, settings |
| **Manager** | `EMP002` | Priya Swaminathan | Branch Operations | Review team performance, approve cases & leaves |
| **Ops** | `EMP003` | Karthik Sundaram | CRM Operations | Manage database, distribute contacts to RMs |
| **RM** | `EMP004` | Ananya Subramanian | Client Telecalling | Assigned calling queue, lead owner, punch in |
| **Sales Manager** | `EMP005` | Murugan Velu | Business Development | Field sales tracking, daily activities & Excel import |

*Password: `password123` (or click any of the one-click quick switch buttons on the login screen).*

---

## 🔌 Future Node.js Backend Migration Reminder (RM Telecalling)

When migrating from `localStorage` to the **Node.js backend**:

1. **Real-Time Sync with Socket.IO** *(replaces browser `storage` events & `beforeunload`)*:
   - Broadcast `lead:locked`, `lead:released`, and `lead:saved` events via **Socket.IO** so all connected RMs' **Queue Leads** lists update immediately.
   - Auto-release any active lock held by an RM on `socket.on('disconnect')`.
2. **Atomic Lock on Server**:
   - Store `locked_by` and `lock_expires_at` in DB (or `SET lock:customer:<id> <rmId> NX EX 45` in Redis) with an atomic conditional check (`locked_by IS NULL OR lock_expires_at < NOW()`) returning `409 Conflict` if already claimed.
3. **Heartbeat + TTL Auto-Expiry**:
   - Keep the **15-second heartbeat** extending `lock_expires_at` by **45 seconds** so abrupt disconnects/crashes return un-saved contacts to other RMs.
4. **Server-Side Per-RM Queue Ordering**:
   - Move the per-RM round-robin bucketing and unlocked filter into `GET /api/telecalling/queue`.

---

© Rajalakshmy Associates. Corporate Financial Advisory & Field CRM Platform.
