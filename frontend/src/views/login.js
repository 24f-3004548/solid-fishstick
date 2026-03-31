const LoginView = {
  template: `
    <div class="d-flex min-vh-100">
      <section class="d-none d-lg-flex flex-column justify-content-between text-white p-5" style="width:58%;background:linear-gradient(135deg,#003f87 0%,#0056b3 100%);">
        <div>
          <span class="badge rounded-pill text-uppercase" style="letter-spacing:.12em;background:rgba(255,255,255,.14);font-size:.62rem">Academic Concierge</span>
          <h1 class="mt-4 mb-3" style="font-size:3.4rem;line-height:1.02;font-weight:800;max-width:520px;">Bridging Talent<br>& Opportunity.</h1>
          <p style="color:rgba(255,255,255,.84);max-width:520px;font-size:1rem;">The elite gateway for university students and global recruiters. Manage career trajectories with institutional precision.</p>
        </div>
        <div class="d-flex gap-5" style="font-weight:700;">
          <div><div style="font-size:2rem;line-height:1;">450+</div><small style="letter-spacing:.1em;color:rgba(255,255,255,.8);">PARTNER FIRMS</small></div>
          <div><div style="font-size:2rem;line-height:1;">98%</div><small style="letter-spacing:.1em;color:rgba(255,255,255,.8);">PLACEMENT RATE</small></div>
        </div>
      </section>

      <section class="d-flex align-items-center justify-content-center p-4" style="flex:1;background:var(--surface);">
        <div class="auth-card" style="max-width:460px;box-shadow:none;background:transparent;">
          <div class="auth-logo">
            <div class="logo-mark"><i class="bi bi-mortarboard-fill"></i></div>
            <h1>Welcome Back</h1>
            <p>Access your placement dashboard</p>
          </div>

          <div v-if="error" class="pp-alert alert-danger mb-3">
            <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
          </div>

          <form @submit.prevent="submit">
            <div class="mb-3">
              <label class="form-label label-required">Email</label>
              <input v-model="form.email" @input="onFieldInput('email')" @blur="touched.email=true;validateField('email')" type="email"
                :class="['form-control', { 'is-invalid': touched.email && errors.email.length }]"
                placeholder="Registered Email" required autofocus />
              <div v-for="err in errors.email" :key="err" class="field-error">
                <i class="bi bi-exclamation-circle"></i> {{ err }}
              </div>
            </div>

            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center">
                <label class="form-label label-required mb-0">Password</label>
                <router-link to="/forgot-password" style="font-size:.74rem;font-weight:700;">Forgot?</router-link>
              </div>
              <div class="input-group mt-1">
                <input v-model="form.password" @input="onFieldInput('password')" @blur="touched.password=true;validateField('password')"
                  :type="showPw ? 'text' : 'password'"
                  :class="['form-control', { 'is-invalid': touched.password && errors.password.length }]"
                  placeholder="Your Password" required />
                <button type="button" class="btn btn-outline-secondary"
                  @click="showPw = !showPw"
                  :title="showPw ? 'Hide password' : 'Show password'"
                  :aria-label="showPw ? 'Hide password' : 'Show password'">
                  <i :class="showPw ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <div v-for="err in errors.password" :key="err" class="field-error">
                <i class="bi bi-exclamation-circle"></i> {{ err }}
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-100" :disabled="loading" style="padding:.8rem .9rem;">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Signing in...' : 'Sign In to Dashboard' }}
            </button>
          </form>

          <p class="text-center text-muted mt-4 mb-3" style="font-size:.84rem">
            Don’t have an account? <router-link to="/register">Register here</router-link>
          </p>

          <div class="mt-3 p-3 rounded-3" style="background:var(--surface-1);font-size:.75rem">
            <p class="text-muted mb-2 fw-semibold">Quick login (dev):</p>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-outline-secondary"
                @click="quickLogin('hrimansaha.10@gmail.com','Admin@1234')">Admin</button>
              <button class="btn btn-sm btn-outline-secondary"
                @click="quickLogin('hr01@amazon.com','Company@123')">Company 1</button>
              <button class="btn btn-sm btn-outline-secondary"
                @click="quickLogin('hr02@microsoft.com','Company@123')">Company 2</button>
              <button class="btn btn-sm btn-outline-secondary"
                @click="quickLogin('student0001@test.com','Student@123')">Student</button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  `,
  data() {
    return {
      form: { email: "", password: "" },
      errors: { email: [], password: [] },
      loading: false,
      error: "",
      showPw: false,
      touched: { email: false, password: false },
    };
  },
  methods: {
    onFieldInput(field) {
      this.error = "";
      if (this.touched[field]) {
        this.validateField(field);
      } else {
        this.errors[field] = [];
      }
    },
    validateField(field) {
      this.errors[field] = [];
      const value = this.form[field];

      if (field === "email") {
        if (!value.trim()) {
          this.errors.email.push("Email is required");
        } else if (!FormValidation.validateEmail(value)) {
          this.errors.email.push("Please enter a valid email address");
        }
      }

      if (field === "password") {
        if (!value) {
          this.errors.password.push("Password is required");
        } else if (value.length < 6) {
          this.errors.password.push("Password must be at least 6 characters");
        }
      }
    },
    validateForm() {
      this.validateField("email");
      this.validateField("password");
      return Object.values(this.errors).every(e => e.length === 0);
    },
    async submit() {
      this.touched.email = true;
      this.touched.password = true;
      if (!this.validateForm()) return;

      this.error = "";
      this.loading = true;
      try {
        const { data } = await ApiService.login(this.form);
        Auth.save(data);
        const role = data.role;
        ppToast("Welcome back! Redirecting to your dashboard...", "success", 2000);
        if (role === "admin") this.$router.push("/admin/dashboard");
        else if (role === "company") this.$router.push("/company/dashboard");
        else this.$router.push("/student/dashboard");
      } catch (e) {
        this.error = e.response?.data?.message || "Login failed. Please try again.";
        ppToast(this.error, "danger");
      } finally {
        this.loading = false;
      }
    },
    quickLogin(email, password) {
      this.form = { email, password };
      this.touched = { email: true, password: true };
      this.submit();
    }
  }
};