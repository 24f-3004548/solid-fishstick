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
  { path: "/login",    component: LoginView,    beforeEnter: redirectIfLoggedIn },
  { path: "/register", component: RegisterView, beforeEnter: redirectIfLoggedIn },

  // Admin routes
  { path: "/admin/dashboard", component: AdminDashboard, beforeEnter: requireRole("admin") },

  // Company routes
  { path: "/company/dashboard", component: CompanyDashboard, beforeEnter: requireRole("company") },

  // Student routes
  { path: "/student/dashboard", component: StudentDashboard, beforeEnter: requireRole("student") },

  // Catch-all
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

// ── Create router ─────────────────────────────────────────────────────────────
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
});