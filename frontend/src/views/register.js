const RegisterView = {
  template: `
    <div class="auth-page">
      <div class="auth-card" style="max-width:520px">

        <div class="auth-logo">
          <div class="logo-mark"><i class="bi bi-person-plus-fill"></i></div>
          <h1>Create account</h1>
          <p>Join the placement portal</p>
        </div>

        <!-- Role toggle -->
        <div class="d-flex gap-2 mb-4 p-1 rounded"
          style="background:var(--surface-2);border:1px solid var(--border)">
          <button v-for="r in ['student','company']" :key="r"
            type="button"
            :class="['btn btn-sm flex-fill', role === r ? 'btn-primary' : 'btn-link text-muted']"
            @click="role = r; error = ''">
            <i :class="r === 'student' ? 'bi bi-person-fill' : 'bi bi-building-fill'"
              class="me-1"></i>
            {{ r.charAt(0).toUpperCase() + r.slice(1) }}
          </button>
        </div>

        <div v-if="error" class="pp-alert alert-danger mb-3">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
        </div>

        <div v-if="success" class="pp-alert alert-success mb-3">
          <i class="bi bi-check-circle-fill"></i> {{ success }}
        </div>

        <!-- Student form -->
        <form v-if="role === 'student'" @submit.prevent="submitStudent">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Full name</label>
              <input v-model="student.full_name" class="form-control"
                placeholder="Raj Kumar" required />
            </div>
            <div class="col-12">
              <label class="form-label">Email address</label>
              <input v-model="student.email" type="email" class="form-control"
                placeholder="raj@college.edu" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Roll number</label>
              <input v-model="student.roll_number" class="form-control"
                placeholder="CS2024001" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Branch</label>
              <select v-model="student.branch" class="form-select" required>
                <option value="">Select branch</option>
                <option v-for="b in branches" :key="b">{{ b }}</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Year</label>
              <select v-model.number="student.year" class="form-select" required>
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">CGPA</label>
              <input v-model.number="student.cgpa" type="number"
                min="0" max="10" step="0.01" class="form-control"
                placeholder="8.5" required />
            </div>
            <div class="col-12">
              <label class="form-label">Password</label>
              <input v-model="student.password" type="password"
                class="form-control" placeholder="Min. 6 characters" required />
            </div>
            <div class="col-12 mt-1">
              <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                {{ loading ? 'Registering...' : 'Create student account' }}
              </button>
            </div>
          </div>
        </form>

        <!-- Company form -->
        <form v-else @submit.prevent="submitCompany">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Company name</label>
              <input v-model="company.name" class="form-control"
                placeholder="Acme Corp" required />
            </div>
            <div class="col-12">
              <label class="form-label">Company email</label>
              <input v-model="company.email" type="email" class="form-control"
                placeholder="hr@acme.com" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">HR contact name</label>
              <input v-model="company.hr_name" class="form-control"
                placeholder="Jane Smith" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">HR email</label>
              <input v-model="company.hr_email" type="email"
                class="form-control" placeholder="jane@acme.com" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Industry</label>
              <input v-model="company.industry" class="form-control"
                placeholder="Software / Finance / etc." />
            </div>
            <div class="col-md-6">
              <label class="form-label">Website</label>
              <input v-model="company.website" class="form-control"
                placeholder="https://acme.com" />
            </div>
            <div class="col-12">
              <label class="form-label">Password</label>
              <input v-model="company.password" type="password"
                class="form-control" placeholder="Min. 6 characters" required />
            </div>
            <div class="col-12">
              <div class="pp-alert alert-warning">
                <i class="bi bi-info-circle-fill"></i>
                After registration, admin must approve your company before you can log in.
              </div>
            </div>
            <div class="col-12">
              <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                {{ loading ? 'Registering...' : 'Create company account' }}
              </button>
            </div>
          </div>
        </form>

        <p class="text-center text-muted mt-4 mb-0" style="font-size:.875rem">
          Already have an account?
          <router-link to="/login">Sign in</router-link>
        </p>
      </div>
    </div>
  `,
  data() {
    return {
      role:    "student",
      loading: false,
      error:   "",
      success: "",
      branches: ["CS","IT","ECE","EE","ME","CE","Chemical","Biotech"],
      student: { full_name:"", email:"", password:"", roll_number:"", branch:"", year:"", cgpa:"" },
      company: { name:"", email:"", password:"", hr_name:"", hr_email:"", industry:"", website:"" },
    };
  },
  methods: {
    async submitStudent() {
      this.error = ""; this.loading = true;
      try {
        await ApiService.registerStudent(this.student);
        this.success = "Account created! You can now log in.";
        setTimeout(() => this.$router.push("/login"), 1800);
      } catch (e) {
        this.error = e.response?.data?.message || "Registration failed.";
      } finally { this.loading = false; }
    },
    async submitCompany() {
      this.error = ""; this.loading = true;
      try {
        await ApiService.registerCompany(this.company);
        this.success = "Company registered! Awaiting admin approval.";
        setTimeout(() => this.$router.push("/login"), 2200);
      } catch (e) {
        this.error = e.response?.data?.message || "Registration failed.";
      } finally { this.loading = false; }
    },
  }
};