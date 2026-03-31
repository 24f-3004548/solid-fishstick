const ForgotPasswordView = {
  template: `
    <div class="d-flex min-vh-100">
      <section class="d-none d-lg-flex flex-column justify-content-between text-white p-5" style="width:58%;background:linear-gradient(135deg,#003f87 0%,#0056b3 100%);">
        <div>
          <span class="badge rounded-pill text-uppercase" style="letter-spacing:.12em;background:rgba(255,255,255,.14);font-size:.62rem">Security Flow</span>
          <h1 class="mt-4 mb-3" style="font-size:3rem;line-height:1.06;font-weight:800;max-width:500px;">Reset Access Securely.</h1>
          <p style="color:rgba(255,255,255,.84);max-width:500px;font-size:1rem;">We’ll send a one-time password reset link to your registered institutional account.</p>
        </div>
      </section>

      <section class="d-flex align-items-center justify-content-center p-4" style="flex:1;background:var(--surface);">
        <div class="auth-card" style="max-width:460px;box-shadow:none;background:transparent;">
          <div class="auth-logo">
            <div class="logo-mark"><i class="bi bi-shield-lock-fill"></i></div>
            <h1>Forgot Password?</h1>
            <p>Recover your account in one step</p>
          </div>

          <div v-if="error" class="pp-alert alert-danger mb-3">
            <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
          </div>
          <div v-if="success" class="pp-alert alert-success mb-3">
            <i class="bi bi-check-circle-fill"></i> {{ success }}
          </div>

          <form @submit.prevent="submit">
            <div class="mb-4">
              <label class="form-label label-required">Institutional Email</label>
              <input v-model="email" @input="onEmailInput" @blur="touched.email=true;validateEmail()" type="email" :class="['form-control', { 'is-invalid': touched.email && errors.email.length }]" required placeholder="name@university.edu" />
              <div v-for="err in errors.email" :key="err" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ err }}</div>
            </div>

            <button type="submit" class="btn btn-primary w-100" :disabled="loading" style="padding:.8rem .9rem;">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Sending...' : 'Send reset link' }}
            </button>
          </form>

          <p class="text-center text-muted mt-4 mb-0" style="font-size:.82rem">
            Remembered your password? <router-link to="/login">Back to login</router-link>
          </p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      email: "",
      errors: { email: [] },
      touched: { email: false },
      loading: false,
      error: "",
      success: "",
    };
  },
  methods: {
    validateEmail() {
      this.errors.email = [];
      const value = this.email?.trim() || "";
      if (!value) {
        this.errors.email.push("Email is required");
      } else if (!FormValidation.validateEmail(value)) {
        this.errors.email.push("Please enter a valid email address");
      }
      return this.errors.email.length === 0;
    },
    onEmailInput() {
      this.error = "";
      this.success = "";
      if (this.touched.email) {
        this.validateEmail();
      } else {
        this.errors.email = [];
      }
    },
    async submit() {
      this.error = "";
      this.success = "";
      this.touched.email = true;
      if (!this.validateEmail()) return;
      this.loading = true;
      try {
        const { data } = await ApiService.forgotPassword({ email: this.email });
        this.success = data.message || "If the account exists, a reset link has been sent.";
      } catch (e) {
        this.error = e.response?.data?.message || "Failed to send reset link.";
      } finally {
        this.loading = false;
      }
    },
  },
};
