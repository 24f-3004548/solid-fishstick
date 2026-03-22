// ── API base URL ────────────────────────────────────────────────────────────
const API_BASE = "http://127.0.0.1:5000/api";

// ── Reactive auth state ──────────────────────────────────────────────────────
const authState = Vue.reactive({
  token: localStorage.getItem("access_token"),
  role:  localStorage.getItem("role"),
  user:  JSON.parse(localStorage.getItem("user") || "null"),
});

// ── Token helpers ───────────────────────────────────────────────────────────
const Auth = {
  getToken()        { return authState.token; },
  getRefreshToken() { return localStorage.getItem("refresh_token"); },
  getUser()         { return authState.user; },
  getRole()         { return authState.role; },

  save(data) {
    localStorage.setItem("access_token",  data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("role",          data.role);
    localStorage.setItem("user",          JSON.stringify(data.profile));
    authState.token = data.access_token;
    authState.role  = data.role;
    authState.user  = data.profile;
  },

  clear() {
    ["access_token","refresh_token","role","user"].forEach(k => localStorage.removeItem(k));
    authState.token = null;
    authState.role  = null;
    authState.user  = null;
  },

  isLoggedIn() { return !!authState.token; },
};

// ── Axios instance with auto token injection ────────────────────────────────
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(config => {
  const token = Auth.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && Auth.getRefreshToken()) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${Auth.getRefreshToken()}` }
        });
        localStorage.setItem("access_token", data.access_token);
        authState.token = data.access_token;
        original.headers.Authorization = `Bearer ${data.access_token}`;
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
  adminDrives:         (q)      => api.get("/admin/drives", { params: q }),
  adminApproveDrive:   (id)     => api.put(`/admin/drives/${id}/approve`),
  adminRejectDrive:    (id, d)  => api.put(`/admin/drives/${id}/reject`, d),
  adminCloseDrive:     (id)     => api.put(`/admin/drives/${id}/close`),
  adminApplications:   (q)      => api.get("/admin/applications", { params: q }),
  adminSearch:         (q)      => api.get("/admin/search", { params: { q } }),
  adminReport:         ()       => api.get("/admin/reports/summary"),

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
  studentWithdraw:     (id)     => api.delete(`/student/applications/${id}/withdraw`),
  studentHistory:      ()       => api.get("/student/history"),
  studentExport:       ()       => api.get("/student/applications/export"),
};