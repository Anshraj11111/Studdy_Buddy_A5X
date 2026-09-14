# Payment System with Admin Approval - Implementation Guide

## ✅ BACKEND COMPLETE

### Models Created:
1. **Payment.js** - Stores payment records with fields:
   - userId, userName, userEmail
   - amount, courseName, courseId
   - transactionId, upiId
   - status (pending/approved/rejected)
   - adminNotes, reviewedBy, reviewedAt

2. **AppSettings.js** - Stores app-wide settings:
   - key, value, description
   - Used to store UPI ID dynamically

### Controllers Created:
1. **payment.controller.js**:
   - `submitPayment()` - Student submits payment
   - `getMyPayments()` - Student sees their payment history
   - `getUpiSettings()` - Get current UPI ID

2. **admin.controller.js** (added functions):
   - `getAllPayments()` - Get all payments (pending/approved/rejected)
   - `approvePayment()` - Approve payment → sets user.isPremium = true
   - `rejectPayment()` - Reject payment
   - `getUpiSettings()` - Get UPI ID
   - `updateUpiSettings()` - Update UPI ID

### Routes Created:
1. **payment.routes.js**:
   - GET `/api/payments/upi-settings` (public)
   - POST `/api/payments/submit` (authenticated)
   - GET `/api/payments/my-payments` (authenticated)

2. **admin.routes.js** (added):
   - GET `/api/admin/payments`
   - PUT `/api/admin/payments/:id/approve`
   - PUT `/api/admin/payments/:id/reject`
   - GET `/api/admin/upi-settings`
   - PUT `/api/admin/upi-settings`

### User Model Updated:
- `isPremium` - boolean flag
- `paidCourses` - array of course purchases
- `totalPaid` - total amount spent
- `hasFreeAccess` - computed from (schoolName && schoolPassword) OR isPremium

---

## 🔄 FRONTEND TODO

### 1. Update PaymentModal.jsx:
- Fetch UPI ID from `/api/payments/upi-settings` on mount
- Generate QR code using fetched UPI ID
- On "I have paid" click → call `/api/payments/submit`
- Show success message: "Payment submitted for verification"

### 2. Update api.js (services):
Add payment API functions:
```javascript
export const paymentAPI = {
  getUpiSettings: () => api.get('/payments/upi-settings'),
  submitPayment: (data) => api.post('/payments/submit', data),
  getMyPayments: () => api.get('/payments/my-payments'),
};

export const adminPaymentAPI = {
  getAllPayments: (params) => api.get('/admin/payments', { params, headers: { 'x-admin-secret': adminSecret } }),
  approvePayment: (id, data) => api.put(`/admin/payments/${id}/approve`, data, { headers: { 'x-admin-secret': adminSecret } }),
  rejectPayment: (id, data) => api.put(`/admin/payments/${id}/reject`, data, { headers: { 'x-admin-secret': adminSecret } }),
  getUpiSettings: () => api.get('/admin/upi-settings', { headers: { 'x-admin-secret': adminSecret } }),
  updateUpiSettings: (data) => api.put('/admin/upi-settings', data, { headers: { 'x-admin-secret': adminSecret } }),
};
```

### 3. Create AdminPanel Payment Tab:
Add new tab in AdminPanel.jsx:
- Show pending payments table with:
  - Student name, email, amount
  - Course name, submitted date
  - Transaction ID (if provided)
  - Status badge (Pending/Approved/Rejected)
  - Approve/Reject buttons for pending payments

- UPI Settings section:
  - Input field to update UPI ID
  - Save button

### 4. Payment Flow:
```
Student clicks "Watch" without free access
  ↓
Payment modal shows with QR code (using dynamic UPI ID)
  ↓
Student scans QR, pays ₹500
  ↓
Student clicks "I have paid ₹500"
  ↓
Frontend calls POST /api/payments/submit
  ↓
Backend creates Payment record (status: pending)
  ↓
Success message: "Payment submitted for verification"
  ↓
Admin sees payment in admin panel
  ↓
Admin clicks "Approve"
  ↓
Backend sets user.isPremium = true
Backend adds to user.paidCourses array
  ↓
User refreshes → hasFreeAccess = true
  ↓
User can now watch videos!
```

---

## 📋 API Endpoints Summary

### Student APIs:
- `GET /api/payments/upi-settings` - Get UPI ID for QR
- `POST /api/payments/submit` - Submit payment
- `GET /api/payments/my-payments` - View payment history

### Admin APIs (require x-admin-secret header):
- `GET /api/admin/payments?status=pending` - Get payments
- `PUT /api/admin/payments/:id/approve` - Approve payment
- `PUT /api/admin/payments/:id/reject` - Reject payment
- `GET /api/admin/upi-settings` - Get UPI ID
- `PUT /api/admin/upi-settings` - Update UPI ID

---

## 🎯 Next Steps:

1. ✅ Backend complete and tested
2. ⏳ Update PaymentModal to fetch UPI ID and submit payment
3. ⏳ Add payment API to services/api.js
4. ⏳ Create Payment Management tab in AdminPanel
5. ⏳ Test complete flow: submit → approve → access granted

---

## 🔐 Security Notes:
- Admin routes require `x-admin-secret` header (value: "H5")
- Payment submission requires authentication (JWT token)
- UPI ID is stored in database, can be changed by admin
- Payment approval automatically grants access (isPremium flag)

---

## 📊 Database Collections:
1. **payments** - All payment records
2. **appsettings** - App-wide settings (UPI ID)
3. **users** - Updated with isPremium, paidCourses, totalPaid

---

**Status:** Backend 100% complete ✅
**Next:** Frontend integration needed
