const Navbar = {
  template: `
    <nav class="navbar app-navbar">
      <div class="container">
        <a class="navbar-brand" href="#">
          <i class="bi bi-mortarboard-fill me-2"></i>PlacementPortal
        </a>

        <div class="d-flex align-items-center gap-2">
          <span v-if="isLoggedIn && role" :class="['role-badge', role]">{{ role }}</span>

          <div v-if="isLoggedIn" class="dropdown">
            <button class="btn btn-sm btn-outline-secondary position-relative" data-bs-toggle="dropdown" @click="loadNotifications">
              <i class="bi bi-bell"></i>
              <span v-if="unreadCount" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {{ unreadCount > 9 ? '9+' : unreadCount }}
              </span>
            </button>
            <div class="dropdown-menu dropdown-menu-end p-2" style="min-width:320px;max-height:380px;overflow:auto">
              <div class="d-flex justify-content-between align-items-center px-2 py-1">
                <strong style="font-size:.9rem">Notifications</strong>
                <button class="btn btn-link btn-sm p-0" @click="markAllRead" :disabled="!unreadCount">Mark all read</button>
              </div>
              <div v-if="!notifications.length" class="text-muted px-2 py-2" style="font-size:.85rem">No notifications yet.</div>
              <button
                v-for="item in notifications"
                :key="item.id"
                class="dropdown-item border rounded-2 mb-1"
                :class="{ 'bg-light': !item.is_read }"
                @click="markRead(item)"
              >
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <strong style="font-size:.84rem">{{ item.title }}</strong>
                  <small class="text-muted">{{ formatTime(item.created_at) }}</small>
                </div>
                <div class="text-muted" style="font-size:.8rem">{{ item.message }}</div>
              </button>
            </div>
          </div>

          <template v-if="isLoggedIn && role === 'admin'">
            <router-link to="/admin/dashboard" class="nav-link">
              <i class="bi bi-speedometer2 me-1"></i>Dashboard
            </router-link>
          </template>

          <template v-if="isLoggedIn && role === 'company'">
            <router-link to="/company/dashboard" class="nav-link">
              <i class="bi bi-building me-1"></i>Dashboard
            </router-link>
          </template>

          <template v-if="isLoggedIn && role === 'student'">
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
    isLoggedIn() { return Auth.isLoggedIn(); },
    role()       { return authState.role; },
    user()       { return authState.user; },
  },
  data() {
    return {
      unreadCount: 0,
      notifications: [],
      _notifTimer: null,
      _authListener: null,
    };
  },
  mounted() {
    this.syncNotificationPolling(this.isLoggedIn);
    this._authListener = () => this.syncNotificationPolling(this.isLoggedIn);
    window.addEventListener("auth-state-changed", this._authListener);
  },
  beforeUnmount() {
    if (this._notifTimer) clearInterval(this._notifTimer);
    if (this._authListener) window.removeEventListener("auth-state-changed", this._authListener);
  },
  watch: {
    isLoggedIn(next, prev) {
      if (next !== prev) this.syncNotificationPolling(next);
    },
  },
  methods: {
    syncNotificationPolling(isLoggedIn) {
      if (this._notifTimer) {
        clearInterval(this._notifTimer);
        this._notifTimer = null;
      }

      if (!isLoggedIn) {
        this.notifications = [];
        this.unreadCount = 0;
        return;
      }

      this.loadNotifications();
      this._notifTimer = setInterval(() => this.loadNotifications(true), 30000);
    },
    async loadNotifications(silent = false) {
      if (!this.isLoggedIn) return;
      try {
        const { data } = await ApiService.notifications({ limit: 8 });
        this.notifications = data.notifications || [];
        this.unreadCount = data.unread_count || 0;
      } catch (e) {
        if (!silent) console.error(e);
      }
    },
    async markRead(item) {
      if (!item || item.is_read) return;
      try {
        await ApiService.notificationMarkRead(item.id);
        item.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      } catch {}
    },
    async markAllRead() {
      try {
        await ApiService.notificationsReadAll();
        this.notifications = this.notifications.map(item => ({ ...item, is_read: true }));
        this.unreadCount = 0;
      } catch {}
    },
    formatTime(iso) {
      if (!iso) return "";
      const dt = new Date(iso);
      return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    },
    async logout() {
      try { await ApiService.logout(); } catch {}
      if (this._notifTimer) clearInterval(this._notifTimer);
      Auth.clear();
      this.$router.push("/login");
    }
  }
};