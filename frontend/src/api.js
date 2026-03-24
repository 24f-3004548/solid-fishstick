// ── API base URL ────────────────────────────────────────────────────────────
const API_HOST = window.location.hostname === "localhost"
  ? "127.0.0.1"
  : window.location.hostname;

const API_BASE =
  window.__API_BASE__ ||
  `${window.location.protocol}//${API_HOST}:5000/api`;

// ── Reactive auth state ──────────────────────────────────────────────────────
const initialLoggedIn = sessionStorage.getItem("is_logged_in") === "true";
if (!initialLoggedIn) {
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("user");
}

const authState = Vue.reactive({
  role: initialLoggedIn ? sessionStorage.getItem("role") : null,
  user: initialLoggedIn ? JSON.parse(sessionStorage.getItem("user") || "null") : null,
  is_logged_in: initialLoggedIn,
});

function emitAuthStateChanged() {
  window.dispatchEvent(new CustomEvent("auth-state-changed", {
    detail: {
      role: authState.role,
      user: authState.user,
      isLoggedIn: authState.is_logged_in && !!authState.role,
    },
  }));
}

// ── Token helpers ───────────────────────────────────────────────────────────
const Auth = {
  getUser() { return authState.user; },
  getRole() { return authState.role; },

  save(data) {
    sessionStorage.setItem("role", data.role);
    sessionStorage.setItem("user", JSON.stringify(data.profile));
    sessionStorage.setItem("is_logged_in", "true");
    authState.role = data.role;
    authState.user = data.profile;
    authState.is_logged_in = true;
    emitAuthStateChanged();
  },

  clear() {
    ["role", "user", "is_logged_in"].forEach(k => sessionStorage.removeItem(k));
    authState.role = null;
    authState.user = null;
    authState.is_logged_in = false;
    emitAuthStateChanged();
  },

  isLoggedIn() {
    return authState.is_logged_in && !!authState.role;
  },
};

// ── Axios instance with auto token injection ────────────────────────────────
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (err.response?.status === 401 && !original._retry && !isRefreshCall && Auth.isLoggedIn()) {
      original._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(original);
      } catch {
        Auth.clear();
        window.location.hash = "#/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── API methods ──────────────────────────────────────────────────────────────
const ApiService = {
  // Auth
  login:           (d) => api.post("/auth/login", d),
  registerStudent: (d) => api.post("/auth/register/student", d),
  registerCompany: (d) => api.post("/auth/register/company", d),
  logout:          ()  => api.post("/auth/logout"),
  me:              ()  => api.get("/auth/me"),
  forgotPassword:  (d) => api.post("/auth/forgot-password", d),
  resetPassword:   (d) => api.post("/auth/reset-password", d),

  // Notifications
  notifications:         (q)      => api.get("/notifications", { params: q }),
  notificationsUnread:   ()       => api.get("/notifications/unread-count"),
  notificationMarkRead:  (id)     => api.put(`/notifications/${id}/read`),
  notificationsReadAll:  ()       => api.put("/notifications/read-all"),

  // Admin
  adminDashboard:      ()       => api.get("/admin/dashboard"),
  adminStudents:       (q)      => api.get("/admin/students", { params: q }),
  adminStudent:        (id)     => api.get(`/admin/students/${id}`),
  adminBlacklistStu:   (id, d)  => api.put(`/admin/students/${id}/blacklist`, d),
  adminUnblacklistStu: (id)     => api.put(`/admin/students/${id}/unblacklist`),
  adminCompanies:      (q)      => api.get("/admin/companies", { params: q }),
  adminCompany:        (id)     => api.get(`/admin/companies/${id}`),
  adminApproveCompany: (id)     => api.put(`/admin/companies/${id}/approve`),
  adminRejectCompany:  (id, d)  => api.put(`/admin/companies/${id}/reject`, d),
  adminBlacklistCo:    (id, d)  => api.put(`/admin/companies/${id}/blacklist`, d),
  adminUnblacklistCo:  (id)     => api.put(`/admin/companies/${id}/unblacklist`),
  adminDrives:         (q)      => api.get("/admin/drives", { params: q }),
  adminApproveDrive:   (id)     => api.put(`/admin/drives/${id}/approve`),
  adminRejectDrive:    (id, d)  => api.put(`/admin/drives/${id}/reject`, d),
  adminCloseDrive:     (id)     => api.put(`/admin/drives/${id}/close`),
  adminApplications:   (q)      => api.get("/admin/applications", { params: q }),
  adminSearch:         (q)      => api.get("/admin/search", { params: { q } }),
  adminReport:         ()       => api.get("/admin/reports/summary"),
  adminSystemHealth:   ()       => api.get("/admin/system/health"),
  adminAuditLogs:      (q)      => api.get("/admin/audit-logs", { params: q }),

  // Company
  companyDashboard:    ()       => api.get("/company/dashboard"),
  companyProfile:      ()       => api.get("/company/profile"),
  companyUpdateProfile:(d)      => api.put("/company/profile", d),
  companyDrives:       (q)      => api.get("/company/drives", { params: q }),
  companyDrive:        (id)     => api.get(`/company/drives/${id}`),
  companyCreateDrive:  (d)      => api.post("/company/drives", d),
  companyUpdateDrive:  (id, d)  => api.put(`/company/drives/${id}`, d),
  companyCloseDrive:   (id)     => api.put(`/company/drives/${id}/close`),
  companyApplications: (id, q)  => api.get(`/company/drives/${id}/applications`, { params: q }),
  companyApplication:  (id)     => api.get(`/company/applications/${id}`),
  companyUpdateApp:    (id, d)  => api.put(`/company/applications/${id}/status`, d),
  companySendOffer:    (id, d)  => api.post(`/company/applications/${id}/offer-letter`, d),
  companyBulkUpdate:   (id, d)  => api.put(`/company/drives/${id}/applications/bulk-update`, d),
  companyHistory:      ()       => api.get("/company/history"),

  // Student
  studentDashboard:    ()       => api.get("/student/dashboard"),
  studentProfile:      ()       => api.get("/student/profile"),
  studentUpdateProfile:(d)      => api.put("/student/profile", d),
  studentUploadResume: (f)      => {
    const fd = new FormData(); fd.append("resume", f);
    return api.post("/student/profile/resume", fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  studentDrives:       (q)      => api.get("/student/drives", { params: q }),
  studentDrive:        (id)     => api.get(`/student/drives/${id}`),
  studentApply:        (id)     => api.post(`/student/drives/${id}/apply`),
  studentApplications: (q)      => api.get("/student/applications", { params: q }),
  studentApplication:  (id)     => api.get(`/student/applications/${id}`),
  studentOfferResponse:(id, d)  => api.put(`/student/applications/${id}/offer-response`, d),
  studentWithdraw:     (id)     => api.delete(`/student/applications/${id}/withdraw`),
  studentHistory:      ()       => api.get("/student/history"),
  studentExport:       ()       => api.get("/student/applications/export"),
};