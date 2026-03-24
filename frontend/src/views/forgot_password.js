const ForgotPasswordView = {
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-mark"><i class="bi bi-shield-lock-fill"></i></div>
          <h1>Forgot password?</h1>
          <p>Enter your account email to receive a reset link</p>
        </div>

        <div v-if="error" class="pp-alert alert-danger mb-3">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
        </div>
        <div v-if="success" class="pp-alert alert-success mb-3">
          <i class="bi bi-check-circle-fill"></i> {{ success }}
        </div>

        <form @submit.prevent="submit">
          <p class="form-legend">Fields marked with * are required.</p>
          <div class="mb-4">
            <label class="form-label label-required">Email address</label>
            <input v-model="email" type="email" class="form-control" required placeholder="you@example.com" />
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Sending...' : 'Send reset link' }}
          </button>
        </form>

        <p class="text-center text-muted mt-4 mb-0" style="font-size:.875rem">
          Remembered your password?
          <router-link to="/login">Back to login</router-link>
        </p>
      </div>
    </div>
  `,
  data() {
    return {
      email: "",
      loading: false,
      error: "",
      success: "",
    };
  },
  methods: {
    async submit() {
      this.error = "";
      this.success = "";
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
