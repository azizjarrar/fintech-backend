# Application Management Backend

This is the backend service for managing Applications, Authentication, and Notifications, with role-based access (Admin, Lender, MSME, Buyer). It includes API endpoints to manage the full lifecycle of applications including submission, approval, invoice upload, funding, repayment, and notifications.

---

## 🚀 Project Setup

1. **Clone the Repository**
```bash
git clone https://github.com/your-username/your-backend-repo.git
cd your-backend-repo
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Variables**

Create a `.env` file with:
```env
MONGO_URI=your-mongodb-uri
JWT_SECRET=your-jwt-secret
```

4. **Run the Server**
```bash
npm run dev
```

---

## 📚 Features

- Full Authentication system (login with validation)
- Role-based Authorization (Admin, Lender, Buyer, MSME)
- Application management:
  - Submit application with document upload (via multer)
  - Approve applications by Admin
  - Approve applications by Lender
  - Upload Invoices by MSMEs
  - Approve Invoices by Buyers
  - Fund Invoice by Lenders
  - Mark Invoices as Repaid by MSMEs
  - Close Application by Lenders
  - Fetch all Applications with pagination
  - Fetch a single Application with normalized "N/A" fields
- Notification system (create and fetch notifications)
- Robust input validation using `express-validator`
- Centralized Error Handling

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Multer (for file uploads)

---

## 📋 API Endpoints

### 🔑 Authentication

| Method | Endpoint | Description |
|:------:|:--------:|:----------- |
| `POST` | `/auth/login` | User login with email and password validation |

---

### 📄 Application Management

| Method | Endpoint | Description | Role |
|:------:|:--------:|:------------|:----:|
| `POST` | `/applications/` | Submit new application (with file uploads) | MSME |
| `POST` | `/applications/approve/:applicationId/:status` | Admin approves/rejects application | Admin |
| `GET`  | `/applications/` | Fetch list of applications with pagination | Admin, Lender, Buyer, MSME |
| `POST` | `/applications/lender-approve/:applicationId` | Lender approves an application | Lender |
| `POST` | `/applications/upload-invoice/:applicationId` | MSME uploads an invoice | MSME |
| `POST` | `/applications/approve-invoice-buyer/:applicationId` | Buyer approves an invoice | Buyer |
| `POST` | `/applications/fund-invoice/:applicationId` | Lender funds an invoice | Lender |
| `POST` | `/applications/markAsRepaid/:applicationId` | MSME marks an invoice as repaid | MSME |
| `POST` | `/applications/closeApplication/:applicationId` | Lender closes an application | Lender |
| `GET`  | `/applications/getApplicationById/:applicationId` | Fetch a single application (auto-normalize missing fields) | Admin, Lender, Buyer, MSME |

---

### 🔔 Notification Management

| Method | Endpoint | Description |
|:------:|:--------:|:------------|
| `POST` | `/notifications/` | Create a new notification |
| `GET`  | `/notifications/` | Fetch all notifications |

---

## 🛡️ Authorization Rules

| Role   | Access to Applications |
|--------|-------------------------|
| Admin  | All applications |
| Lender | Only assigned applications |
| Buyer  | Only buyer's own applications |
| MSME   | Only MSME's own applications |

Unauthorized access automatically returns `403 Forbidden`.

---

## ⚙️ Middleware

- **`authenticate`**: Verify JWT token from request headers.
- **`authorize(roles)`**: Allow access only to users with specified roles.
- **`multer_setup`**: File upload setup for document and invoice uploads.
- **`express-validator`**: Validate inputs for login and application submission.

---

## 📋 Validation

- Login: Validates email format and password length.
- Application Submission: Validates credit score between 0 and 800.
- Multer handles document file uploads with field restrictions.

---

## 🛡️ Error Handling

- Missing Application → Normalized "N/A" fields.
- Unauthorized Role → `403 Forbidden`.
- Input Validation Errors → `400 Bad Request`.
- Database errors passed to Express global error handler.
- Clean JSON error responses.

---

## 🧹 Code Quality

- Modular Controllers
- Separated Middlewares
- Constants for default fields
- Helper functions (`normalize`) to format output
- Clean async/await usage
- Proper pagination and sorting (`skip`, `limit`, `sort`)

---

## 🗂️ Folder Structure

```
controllers/
  - application_controller.js
  - auth_controller.js
  - notification_controller.js
middleware/
  - auth_middleware.js
  - authorize.js
lib/
  - assignLender.js
  - auto_fill.js
  - multer_setup.js
  - validator_required_data.js
routes/
  - application_route.js
  - auth_route.js
  - notification_route.js
  - user_model.js
models/
  - Application.js
  - User.js
  - Notification.js
.env
server.js
```

