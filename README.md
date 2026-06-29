# 🏥 SkyMed ERP v7.0

> **Complete Inventory, Finance & Payroll Management System**

![Version](https://img.shields.io/badge/version-7.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![TiDB](https://img.shields.io/badge/TiDB-Cloud-orange)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## 📋 **Table of Contents**

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Modules](#-modules)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [License](#-license)
- [Contact](#-contact)

---

## ✨ **Features**

### 🔐 **Security & Authentication**
- ✅ JWT-based Authentication
- ✅ 2-Factor Authentication (Google Authenticator)
- ✅ Admin Approval Workflow
- ✅ Rate Limiting (5 attempts/15 min)
- ✅ Account Locking
- ✅ Audit Logs
- ✅ Role-Based Access (Admin/Manager/Staff)

### 📦 **Inventory Management**
- ✅ Add/Edit/Delete Items
- ✅ Category-wise Filtering
- ✅ Low Stock Alerts
- ✅ Expiry Tracking
- ✅ Soft Delete with Recovery
- ✅ Export to Excel

### 💰 **Finance Modules**
- ✅ Receivables & Payables
- ✅ Vendor Ledger
- ✅ Advances & Security Deposits
- ✅ Provision Management
- ✅ GST Tracking
- ✅ Payment Tracking (UTR)

### 👥 **Payroll**
- ✅ Employee Management
- ✅ Attendance Tracking
- ✅ Leave Management (PL/CL/SL)
- ✅ Salary Calculation
- ✅ Bulk Invoice Generation
- ✅ Contract Management

### 📊 **Other Features**
- ✅ Asset Management
- ✅ Imprest Management
- ✅ Data Backup (Auto)
- ✅ Dark Mode
- ✅ Customizable Settings
- ✅ Mobile Responsive

---

## 🛠️ **Tech Stack**

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js + Express.js |
| **Database** | TiDB Cloud (MySQL-compatible) |
| **Authentication** | JWT + bcrypt |
| **2FA** | Speakeasy (TOTP) |
| **Data Export** | XLSX |
| **QR Code** | QRCode.js |
| **Cron Jobs** | node-cron |

---

## 🚀 **Installation**

### **Prerequisites**
- Node.js v18.x or higher
- npm or yarn
- TiDB Cloud Account (Free)

### **Steps**

```bash
# 1. Clone the repository
git clone https://github.com/your-username/skymed-erp.git
cd skymed-erp

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your TiDB credentials

# 4. Start the server
npm start

# 5. Open in browser
http://localhost:3000/login.html
