const Navbar = {
  template: `
    <nav class="navbar app-navbar">
      <div class="container">
        <a class="navbar-brand" href="#">
          <i class="bi bi-mortarboard-fill me-2"></i>PlacementPortal
        </a>

        <div class="d-flex align-items-center gap-2">
          <span v-if="role" :class="['role-badge', role]">{{ role }}</span>

          <template v-if="role === 'admin'">
            <router-link to="/admin/dashboard" class="nav-link">
              <i class="bi bi-speedometer2 me-1"></i>Dashboard
            </router-link>
          </template>

          <template v-if="role === 'company'">
            <router-link to="/company/dashboard" class="nav-link">
              <i class="bi bi-building me-1"></i>Dashboard
            </router-link>
          </template>

          <template v-if="role === 'student'">
            <router-link to="/student/dashboard" class="nav-link">
              <i class="bi bi-person-workspace me-1"></i>Dashboard
            </router-link>
          </template>

          <button v-if="isLoggedIn" @click="logout"
            class="btn btn-sm btn-outline-secondary ms-2">
            <i class="bi bi-box-arrow-right me-1"></i>Logout
          </button>

          <template v-else>
            <router-link to="/login" class="btn btn-sm btn-outline-primary">Login</router-link>
            <router-link to="/register" class="btn btn-sm btn-primary">Register</router-link>
          </template>
        </div>
      </div>
    </nav>
  `,
  computed: {
    isLoggedIn() { return !!authState.token; },
    role()       { return authState.role; },
    user()       { return authState.user; },
  },
  methods: {
    async logout() {
      try { await ApiService.logout(); } catch {}
      Auth.clear();
      this.$router.push("/login");
    }
  }
};