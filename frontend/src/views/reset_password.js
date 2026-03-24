const ResetPasswordView = {
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-mark"><i class="bi bi-key-fill"></i></div>
          <h1>Reset password</h1>
          <p>Set a new password for your account</p>
        </div>

        <div v-if="error" class="pp-alert alert-danger mb-3">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
        </div>
        <div v-if="success" class="pp-alert alert-success mb-3">
          <i class="bi bi-check-circle-fill"></i> {{ success }}
        </div>

        <form @submit.prevent="submit">
          <p class="form-legend">Fields marked with * are required.</p>
          <div class="mb-3">
            <label class="form-label label-required">New password</label>
            <input v-model="newPassword" :type="showPw ? 'text' : 'password'" class="form-control" required placeholder="Min. 6 characters" />
            <div class="field-hint">Use at least 6 characters.</div>
          </div>

          <div class="mb-4">
            <label class="form-label label-required">Confirm password</label>
            <input v-model="confirmPassword" :type="showPw ? 'text' : 'password'" class="form-control" required placeholder="Re-enter new password" />
            <button type="button" class="btn btn-link px-0 mt-1" @click="showPw = !showPw">
              {{ showPw ? 'Hide password' : 'Show password' }}
            </button>
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading || !token">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Resetting...' : 'Reset password' }}
          </button>
        </form>

        <p class="text-center text-muted mt-4 mb-0" style="font-size:.875rem">
          <router-link to="/login">Back to login</router-link>
        </p>
      </div>
    </div>
  `,
  data() {
    return {
      token: "",
      newPassword: "",
      confirmPassword: "",
      showPw: false,
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
    async submit() {
      this.error = "";
      this.success = "";

      if (this.newPassword.length < 6) {
        this.error = "Password must be at least 6 characters.";
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.error = "Passwords do not match.";
        return;
      }

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
