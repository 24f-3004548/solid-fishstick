const LoginView = {
  template: `
    <div class="auth-page">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="logo-mark"><i class="bi bi-mortarboard-fill"></i></div>
          <h1>Welcome back</h1>
          <p>Sign in to your placement portal account</p>
        </div>

        <div v-if="error" class="pp-alert alert-danger mb-3">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
        </div>

        <form @submit.prevent="submit">
          <div class="mb-3">
            <label class="form-label">Email address</label>
            <input v-model="form.email" type="email" class="form-control"
              placeholder="you@example.com" required autofocus />
          </div>

          <div class="mb-4">
            <label class="form-label">Password</label>
            <div class="input-group">
              <input v-model="form.password" :type="showPw ? 'text' : 'password'"
                class="form-control" placeholder="••••••••" required />
              <button type="button" class="btn btn-outline-secondary"
                @click="showPw = !showPw">
                <i :class="showPw ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>

        <hr class="my-4" />

        <p class="text-center text-muted mb-0" style="font-size:.875rem">
          Don't have an account?
          <router-link to="/register">Register here</router-link>
        </p>

        <!-- Quick test logins for development -->
        <div class="mt-4 p-3 rounded" style="background:var(--surface-2);font-size:.78rem">
          <p class="text-muted mb-2 fw-500">Quick login (dev only):</p>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-secondary"
              @click="quickLogin('admin@placement.com','Admin@1234')">Admin</button>
            <button class="btn btn-sm btn-outline-secondary"
              @click="quickLogin('student@test.com','test123')">Student</button>
          </div>
        </div>

      </div>
    </div>
  `,
  data() {
    return {
      form: { email: "", password: "" },
      loading: false,
      error: "",
      showPw: false,
    };
  },
  methods: {
    async submit() {
      this.error   = "";
      this.loading = true;
      try {
        const { data } = await ApiService.login(this.form);
        Auth.save(data);
        const role = data.role;
        if (role === "admin")   this.$router.push("/admin/dashboard");
        else if (role === "company") this.$router.push("/company/dashboard");
        else                    this.$router.push("/student/dashboard");
      } catch (e) {
        this.error = e.response?.data?.message || "Login failed. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    quickLogin(email, password) {
      this.form = { email, password };
      this.submit();
    }
  }
};