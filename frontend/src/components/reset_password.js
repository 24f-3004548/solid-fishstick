const ResetPasswordView = {
  template: `
    <div class="d-flex min-vh-100">
      <section class="d-none d-lg-flex flex-column justify-content-between text-white p-5" style="width:58%;background:linear-gradient(135deg,#003f87 0%,#0056b3 100%);">
        <div>
          <span class="badge rounded-pill text-uppercase" style="letter-spacing:.12em;background:rgba(255,255,255,.14);font-size:.62rem">Account Recovery</span>
          <h1 class="mt-4 mb-3" style="font-size:3rem;line-height:1.06;font-weight:800;max-width:500px;">Create a New Secure Password.</h1>
          <p style="color:rgba(255,255,255,.84);max-width:500px;font-size:1rem;">Use a strong password you haven’t used before. Your old password will be invalid immediately.</p>
        </div>
      </section>

      <section class="d-flex align-items-center justify-content-center p-4" style="flex:1;background:var(--surface);">
        <div class="auth-card" style="max-width:460px;box-shadow:none;background:transparent;">
          <div class="auth-logo">
            <div class="logo-mark"><i class="bi bi-key-fill"></i></div>
            <h1>Reset Password</h1>
            <p>Set a fresh password for your account</p>
          </div>

          <div v-if="error" class="pp-alert alert-danger mb-3">
            <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
          </div>
          <div v-if="success" class="pp-alert alert-success mb-3">
            <i class="bi bi-check-circle-fill"></i> {{ success }}
          </div>

          <form @submit.prevent="submit">
            <div class="mb-3">
              <label class="form-label label-required">New password</label>
              <div class="input-group">
                <input v-model="newPassword" @input="onPasswordInput" @blur="touched.newPassword=true;validatePassword()" :type="showNewPassword ? 'text' : 'password'" :class="['form-control', { 'is-invalid': touched.newPassword && errors.newPassword.length }]" required placeholder="Minimum 6 characters" />
                <button type="button" class="btn btn-outline-secondary"
                  @click="showNewPassword = !showNewPassword"
                  :title="showNewPassword ? 'Hide password' : 'Show password'"
                  :aria-label="showNewPassword ? 'Hide password' : 'Show password'">
                  <i :class="showNewPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <div v-for="err in errors.newPassword" :key="err" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ err }}</div>
              <div class="field-hint" style="margin-top:.35rem;">Password requirements: at least 6 characters and only letters (A-Z, a-z) and numbers (0-9).</div>
            </div>

            <div class="mb-4">
              <label class="form-label label-required">Confirm password</label>
              <div class="input-group">
                <input v-model="confirmPassword" @input="onConfirmPasswordInput" @blur="touched.confirmPassword=true;validateConfirmPassword()" :type="showConfirmPassword ? 'text' : 'password'" :class="['form-control', { 'is-invalid': touched.confirmPassword && errors.confirmPassword.length }]" required placeholder="Re-enter new password" />
                <button type="button" class="btn btn-outline-secondary"
                  @click="showConfirmPassword = !showConfirmPassword"
                  :title="showConfirmPassword ? 'Hide password' : 'Show password'"
                  :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'">
                  <i :class="showConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <div v-for="err in errors.confirmPassword" :key="err" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ err }}</div>
            </div>

            <button type="submit" class="btn btn-primary w-100" :disabled="loading || !token" style="padding:.8rem .9rem;">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Resetting...' : 'Reset password' }}
            </button>
          </form>

          <p class="text-center text-muted mt-4 mb-0" style="font-size:.82rem">
            <router-link to="/login">Back to login</router-link>
          </p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      token: "",
      newPassword: "",
      confirmPassword: "",
      errors: { newPassword: [], confirmPassword: [] },
      touched: { newPassword: false, confirmPassword: false },
      showNewPassword: false,
      showConfirmPassword: false,
      loading: false,
      error: "",
      success: "",
    };
  },
  mounted() {
    const token = this.$route.query?.token;
    if (!token) {
      this.error = "Reset token is missing. Please use the link from your email.";
      return;
    }
    this.token = String(token);
  },
  methods: {
    validatePassword() {
      this.errors.newPassword = [];
      if (!this.newPassword) {
        this.errors.newPassword.push("Password is required.");
        return false;
      }

      const validation = FormValidation.validatePassword(this.newPassword);
      if (!validation.isValid) {
        this.errors.newPassword.push("Password must be alphanumeric and at least 6 characters.");
      }

      return this.errors.newPassword.length === 0;
    },
    validateConfirmPassword() {
      this.errors.confirmPassword = [];
      if (!this.confirmPassword) {
        this.errors.confirmPassword.push("Please confirm your password.");
      } else if (this.confirmPassword !== this.newPassword) {
        this.errors.confirmPassword.push("Passwords do not match.");
      }
      return this.errors.confirmPassword.length === 0;
    },
    onPasswordInput() {
      this.error = "";
      this.success = "";
      if (this.touched.newPassword) this.validatePassword();
      else this.errors.newPassword = [];

      if (this.touched.confirmPassword) this.validateConfirmPassword();
    },
    onConfirmPasswordInput() {
      this.error = "";
      this.success = "";
      if (this.touched.confirmPassword) this.validateConfirmPassword();
      else this.errors.confirmPassword = [];
    },
    async submit() {
      this.error = "";
      this.success = "";

      this.touched.newPassword = true;
      this.touched.confirmPassword = true;
      const isPasswordValid = this.validatePassword();
      const isConfirmPasswordValid = this.validateConfirmPassword();
      if (!isPasswordValid || !isConfirmPasswordValid) return;

      this.loading = true;
      try {
        const { data } = await ApiService.resetPassword({
          token: this.token,
          new_password: this.newPassword,
        });
        this.success = data.message || "Password reset successful.";
        setTimeout(() => this.$router.push("/login"), 1200);
      } catch (e) {
        this.error = e.response?.data?.message || "Failed to reset password.";
      } finally {
        this.loading = false;
      }
    },
  },
};
