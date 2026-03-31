// ── Route guard ──────────────────────────────────────────────────────────────
function requireAuth(to, from, next) {
  if (!Auth.isLoggedIn()) return next("/login");
  next();
}

function requireRole(role) {
  return (to, from, next) => {
    if (!Auth.isLoggedIn()) return next("/login");
    if (Auth.getRole() !== role) return next("/login");
    next();
  };
}

function redirectIfLoggedIn(to, from, next) {
  if (Auth.isLoggedIn()) {
    const role = Auth.getRole();
    if (role === "admin")   return next("/admin/dashboard");
    if (role === "company") return next("/company/dashboard");
    if (role === "student") return next("/student/dashboard");
  }
  next();
}

function roleSection(component, role, section, path) {
  return {
    path,
    component,
    props: { section },
    meta: { role, section },
    beforeEnter: requireRole(role),
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────
const routes = [
  // Default redirect
  { path: "/", redirect: () => {
    if (!Auth.isLoggedIn()) return "/login";
    const role = Auth.getRole();
    if (role === "admin")   return "/admin/dashboard";
    if (role === "company") return "/company/dashboard";
    return "/student/dashboard";
  }},

  // Auth
  { path: "/login",    component: LoginView,    beforeEnter: redirectIfLoggedIn, meta: { hideNavbar: true } },
  { path: "/register", component: RegisterView, beforeEnter: redirectIfLoggedIn, meta: { hideNavbar: true } },
  { path: "/forgot-password", component: ForgotPasswordView, beforeEnter: redirectIfLoggedIn, meta: { hideNavbar: true } },
  { path: "/reset-password", component: ResetPasswordView, beforeEnter: redirectIfLoggedIn, meta: { hideNavbar: true } },

  // Admin routes
  roleSection(AdminDashboard, "admin", "overview", "/admin/dashboard"),
  roleSection(AdminDashboard, "admin", "companies", "/admin/companies"),
  roleSection(AdminDashboard, "admin", "students", "/admin/students"),
  roleSection(AdminDashboard, "admin", "drives", "/admin/drives"),
  roleSection(AdminDashboard, "admin", "applications", "/admin/applications"),
  roleSection(AdminDashboard, "admin", "reports", "/admin/reports"),
  roleSection(AdminDashboard, "admin", "health", "/admin/system-health"),
  roleSection(AdminDashboard, "admin", "audit", "/admin/audit-logs"),

  // Company routes
  roleSection(CompanyDashboard, "company", "overview", "/company/dashboard"),
  roleSection(CompanyDashboard, "company", "drives", "/company/drives"),
  roleSection(CompanyDashboard, "company", "applications", "/company/applications"),
  roleSection(CompanyDashboard, "company", "history", "/company/hiring-history"),
  roleSection(CompanyDashboard, "company", "profile", "/company/settings"),

  // Student routes
  roleSection(StudentDashboard, "student", "overview", "/student/dashboard"),
  roleSection(StudentDashboard, "student", "drives", "/student/drives"),
  roleSection(StudentDashboard, "student", "applications", "/student/applications"),
  roleSection(StudentDashboard, "student", "history", "/student/history"),
  roleSection(StudentDashboard, "student", "profile", "/student/profile"),

  // Catch-all
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

// ── Create router ─────────────────────────────────────────────────────────────
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
});