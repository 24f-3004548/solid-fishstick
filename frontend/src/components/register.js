const RegisterView = {
  template: `
    <div class="d-flex min-vh-100">
      <section class="d-none d-lg-flex flex-column justify-content-between text-white p-5" style="width:58%;background:linear-gradient(135deg,#003f87 0%,#0056b3 100%);">
        <div>
          <span class="badge rounded-pill text-uppercase" style="letter-spacing:.12em;background:rgba(255,255,255,.14);font-size:.62rem">CareerSync</span>
          <h1 class="mt-4 mb-3" style="font-size:3.2rem;line-height:1.02;font-weight:800;max-width:520px;">Your Career Journey Starts Here.</h1>
          <p style="color:rgba(255,255,255,.84);max-width:520px;font-size:1rem;">Create your institution-grade profile and connect with curated placement opportunities.</p>
        </div>
        <div class="d-flex gap-5" style="font-weight:700;">
          <div><div style="font-size:2rem;line-height:1;">1200+</div><small style="letter-spacing:.1em;color:rgba(255,255,255,.8);">ACTIVE OFFERS</small></div>
          <div><div style="font-size:2rem;line-height:1;">65+</div><small style="letter-spacing:.1em;color:rgba(255,255,255,.8);">PARTNER CAMPUSES</small></div>
        </div>
      </section>

      <section class="d-flex align-items-center justify-content-center p-4" style="flex:1;background:var(--surface);">
        <div class="auth-card" style="max-width:560px;box-shadow:none;background:transparent;">
          <div class="auth-logo">
            <div class="logo-mark"><i class="bi bi-person-plus-fill"></i></div>
            <h1>Create Account</h1>
            <p>Build your portal identity</p>
          </div>

          <div class="d-flex gap-2 mb-4 p-1 rounded-3" style="background:var(--surface-1)">
            <button v-for="r in ['student','company']" :key="r"
              type="button"
              :class="['btn btn-sm flex-fill', role === r ? 'btn-primary' : 'btn-outline-secondary']"
              @click="role = r; error = ''; errors = {}; success = ''">
              <i :class="r === 'student' ? 'bi bi-person-fill' : 'bi bi-building-fill'" class="me-1"></i>
              {{ r.charAt(0).toUpperCase() + r.slice(1) }}
            </button>
          </div>

          <div v-if="error" class="pp-alert alert-danger mb-3">
            <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
          </div>
          <div v-if="success" class="pp-alert alert-success mb-3">
            <i class="bi bi-check-circle-fill"></i> {{ success }}
          </div>

          <form v-if="role === 'student'" @submit.prevent="submitStudent">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label label-required">Full name</label>
                <input v-model="student.full_name" @input="clearFieldError('full_name')" :class="['form-control', { 'is-invalid': errors.full_name }]"
                  placeholder="Raj Kumar" required />
                <div v-if="errors.full_name" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.full_name[0] }}</div>
              </div>
              <div class="col-12">
                <label class="form-label label-required">Email address</label>
                <input v-model="student.email" @input="clearFieldError('email')" type="email" :class="['form-control', { 'is-invalid': errors.email }]"
                  placeholder="raj@college.edu" required />
                <div v-if="errors.email" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.email[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label label-required">Phone number</label>
                <input v-model="student.phone" @input="clearFieldError('phone')" :class="['form-control', { 'is-invalid': errors.phone }]"
                  placeholder="+91XXXXXXXXXX" required />
                <div v-if="errors.phone" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.phone[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label label-required">Date of birth</label>
                <input v-model="student.dob" @change="clearFieldError('dob')" type="date" :class="['form-control', { 'is-invalid': errors.dob }]" required />
                <div v-if="errors.dob" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.dob[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label label-required">Branch</label>
                <select v-model="student.branch" @change="clearFieldError('branch')" :class="['form-select', { 'is-invalid': errors.branch }]" required>
                  <option value="">Select branch</option>
                  <option v-for="b in branches" :key="b">{{ b }}</option>
                </select>
                <div v-if="errors.branch" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.branch[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label label-required">Year</label>
                <select v-model.number="student.year" @change="clearFieldError('year')" :class="['form-select', { 'is-invalid': errors.year }]" required>
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                <div v-if="errors.year" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.year[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label label-required">CGPA</label>
                <input v-model.number="student.cgpa" type="number" min="0" max="10" step="0.01"
                  @input="clearFieldError('cgpa')"
                  :class="['form-control', { 'is-invalid': errors.cgpa }]" placeholder="8.5" required />
                <div v-if="errors.cgpa" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.cgpa[0] }}</div>
              </div>
              <div class="col-12">
                <label class="form-label label-required">Password</label>
                <div class="input-group">
                  <input v-model="student.password" @input="onStudentPasswordInput" :type="showStudentPassword ? 'text' : 'password'"
                    :class="['form-control', { 'is-invalid': errors.password }]" placeholder="Min. 6 alphanumeric characters" required />
                  <button type="button" class="btn btn-outline-secondary" @click="showStudentPassword = !showStudentPassword"
                    :title="showStudentPassword ? 'Hide password' : 'Show password'" :aria-label="showStudentPassword ? 'Hide password' : 'Show password'">
                    <i :class="showStudentPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                <div v-if="errors.password" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.password[0] }}</div>
                <div class="field-hint" style="margin-top:.35rem;">Password requirements: at least 6 characters and only letters (A-Z, a-z) and numbers (0-9).</div>
              </div>
              <div class="col-12">
                <label class="form-label label-required">Confirm Password</label>
                <div class="input-group">
                  <input v-model="student.confirmPassword" @input="clearFieldError('confirmPassword')" :type="showStudentConfirmPassword ? 'text' : 'password'"
                    :class="['form-control', { 'is-invalid': errors.confirmPassword }]" placeholder="Confirm password" required />
                  <button type="button" class="btn btn-outline-secondary" @click="showStudentConfirmPassword = !showStudentConfirmPassword"
                    :title="showStudentConfirmPassword ? 'Hide password' : 'Show password'" :aria-label="showStudentConfirmPassword ? 'Hide password' : 'Show password'">
                    <i :class="showStudentConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                <div v-if="errors.confirmPassword" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.confirmPassword[0] }}</div>
              </div>
              <div class="col-12 mt-1">
                <button type="submit" class="btn btn-primary w-100" :disabled="loading" style="padding:.8rem .9rem;">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ loading ? 'Registering...' : 'Create student account' }}
                </button>
              </div>
            </div>
          </form>

          <form v-else @submit.prevent="submitCompany">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label label-required">Company name</label>
                <input v-model="company.name" @input="clearFieldError('name')" :class="['form-control', { 'is-invalid': errors.name }]" placeholder="Acme Corp" required />
                <div v-if="errors.name" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.name[0] }}</div>
              </div>
              <div class="col-12">
                <label class="form-label label-required">Company email</label>
                <input v-model="company.email" @input="clearFieldError('email')" type="email" :class="['form-control', { 'is-invalid': errors.email }]" placeholder="hr@acme.com" required />
                <div v-if="errors.email" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.email[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label label-required">HR contact name</label>
                <input v-model="company.hr_name" @input="clearFieldError('hr_name')" :class="['form-control', { 'is-invalid': errors.hr_name }]" placeholder="Jane Smith" required />
                <div v-if="errors.hr_name" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.hr_name[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label label-required">HR email</label>
                <input v-model="company.hr_email" @input="clearFieldError('hr_email')" type="email" :class="['form-control', { 'is-invalid': errors.hr_email }]" placeholder="jane@acme.com" required />
                <div v-if="errors.hr_email" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.hr_email[0] }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Industry</label>
                <input v-model="company.industry" @input="error = ''" class="form-control" placeholder="Software / Finance / etc." />
              </div>
              <div class="col-md-6">
                <label class="form-label">Website</label>
                <input v-model="company.website" @input="error = ''" class="form-control" placeholder="https://acme.com" />
              </div>
              <div class="col-12">
                <label class="form-label label-required">Password</label>
                <div class="input-group">
                  <input v-model="company.password" @input="onCompanyPasswordInput" :type="showCompanyPassword ? 'text' : 'password'" :class="['form-control', { 'is-invalid': errors.password }]" placeholder="Min. 6 alphanumeric characters" required />
                  <button type="button" class="btn btn-outline-secondary" @click="showCompanyPassword = !showCompanyPassword"
                    :title="showCompanyPassword ? 'Hide password' : 'Show password'" :aria-label="showCompanyPassword ? 'Hide password' : 'Show password'">
                    <i :class="showCompanyPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                <div v-if="errors.password" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.password[0] }}</div>
                <div class="field-hint" style="margin-top:.35rem;">Password requirements: at least 6 characters and only letters (A-Z, a-z) and numbers (0-9).</div>
              </div>
              <div class="col-12">
                <label class="form-label label-required">Confirm Password</label>
                <div class="input-group">
                  <input v-model="company.confirmPassword" @input="clearFieldError('confirmPassword')" :type="showCompanyConfirmPassword ? 'text' : 'password'" :class="['form-control', { 'is-invalid': errors.confirmPassword }]" placeholder="Confirm password" required />
                  <button type="button" class="btn btn-outline-secondary" @click="showCompanyConfirmPassword = !showCompanyConfirmPassword"
                    :title="showCompanyConfirmPassword ? 'Hide password' : 'Show password'" :aria-label="showCompanyConfirmPassword ? 'Hide password' : 'Show password'">
                    <i :class="showCompanyConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                <div v-if="errors.confirmPassword" class="field-error"><i class="bi bi-exclamation-circle"></i> {{ errors.confirmPassword[0] }}</div>
              </div>
              <div class="col-12">
                <div class="pp-alert alert-warning">
                  <i class="bi bi-info-circle-fill"></i>
                  After registration, admin approval is required before login.
                </div>
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary w-100" :disabled="loading" style="padding:.8rem .9rem;">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ loading ? 'Registering...' : 'Create company account' }}
                </button>
              </div>
            </div>
          </form>

          <p class="text-center text-muted mt-4 mb-0" style="font-size:.82rem">
            Already have an account? <router-link to="/login">Sign in</router-link>
          </p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      role: "student",
      loading: false,
      error: "",
      success: "",
      branches: ["CS","IT","ECE","EE","ME","CE","Chemical","Biotech"],
      touched: {},
      errors: {},
      showStudentPassword: false,
      showStudentConfirmPassword: false,
      showCompanyPassword: false,
      showCompanyConfirmPassword: false,
      student: { full_name:"", email:"", password:"", confirmPassword:"", phone:"", dob:"", branch:"", year:"", cgpa:"" },
      company: { name:"", email:"", password:"", confirmPassword:"", hr_name:"", hr_email:"", industry:"", website:"" },
    };
  },
  methods: {
    clearFieldError(field) {
      if (this.errors[field]) delete this.errors[field];
      this.error = "";
    },
    onStudentPasswordInput() {
      this.clearFieldError("password");
      if (this.student.confirmPassword && this.student.confirmPassword === this.student.password) {
        this.clearFieldError("confirmPassword");
      }
    },
    onCompanyPasswordInput() {
      this.clearFieldError("password");
      if (this.company.confirmPassword && this.company.confirmPassword === this.company.password) {
        this.clearFieldError("confirmPassword");
      }
    },
    validateStudentForm() {
      this.errors = {};
      const s = this.student;

      if (!s.full_name?.trim()) this.errors.full_name = ["Full name is required"];
      if (!s.email?.trim()) this.errors.email = ["Email is required"];
      else if (!FormValidation.validateEmail(s.email)) this.errors.email = ["Invalid email format"];

      if (!s.phone?.trim()) this.errors.phone = ["Phone number is required"];
      if (!s.dob) this.errors.dob = ["Date of birth is required"];
      if (!s.branch) this.errors.branch = ["Branch is required"];
      if (!s.year) this.errors.year = ["Year is required"];
      if (s.cgpa === "" || s.cgpa === null) this.errors.cgpa = ["CGPA is required"];

      if (!s.password) this.errors.password = ["Password is required"];
      else {
        const validation = FormValidation.validatePassword(s.password);
        if (!validation.isValid) this.errors.password = ["Password must be alphanumeric and at least 6 characters"];
      }

      if (!s.confirmPassword) this.errors.confirmPassword = ["Please confirm password"];
      else if (s.password !== s.confirmPassword) this.errors.confirmPassword = ["Passwords do not match"];

      return Object.keys(this.errors).length === 0;
    },
    validateCompanyForm() {
      this.errors = {};
      const c = this.company;

      if (!c.name?.trim()) this.errors.name = ["Company name is required"];
      if (!c.email?.trim()) this.errors.email = ["Email is required"];
      else if (!FormValidation.validateEmail(c.email)) this.errors.email = ["Invalid email format"];

      if (!c.hr_name?.trim()) this.errors.hr_name = ["HR contact name is required"];
      if (!c.hr_email?.trim()) this.errors.hr_email = ["HR email is required"];
      else if (!FormValidation.validateEmail(c.hr_email)) this.errors.hr_email = ["Invalid email format"];

      if (!c.password) this.errors.password = ["Password is required"];
      else {
        const validation = FormValidation.validatePassword(c.password);
        if (!validation.isValid) this.errors.password = ["Password must be alphanumeric and at least 6 characters"];
      }

      if (!c.confirmPassword) this.errors.confirmPassword = ["Please confirm password"];
      else if (c.password !== c.confirmPassword) this.errors.confirmPassword = ["Passwords do not match"];

      return Object.keys(this.errors).length === 0;
    },
    async submitStudent() {
      if (!this.validateStudentForm()) {
        ppToast("Please fix the errors in the form", "danger");
        return;
      }

      this.error = ""; this.loading = true;
      try {
        const data = { ...this.student };
        delete data.confirmPassword;
        await ApiService.registerStudent(data);
        this.success = "Account created! You can now log in.";
        ppToast("Registration successful!", "success", 2000);
        setTimeout(() => this.$router.push("/login"), 1800);
      } catch (e) {
        this.error = e.response?.data?.message || "Registration failed.";
        ppToast(this.error, "danger");
      } finally { this.loading = false; }
    },
    async submitCompany() {
      if (!this.validateCompanyForm()) {
        ppToast("Please fix the errors in the form", "danger");
        return;
      }

      this.error = ""; this.loading = true;
      try {
        const data = { ...this.company };
        delete data.confirmPassword;
        await ApiService.registerCompany(data);
        this.success = "Company registered! Awaiting admin approval.";
        ppToast("Registration successful! Awaiting admin approval.", "success", 2000);
        setTimeout(() => this.$router.push("/login"), 2200);
      } catch (e) {
        this.error = e.response?.data?.message || "Registration failed.";
        ppToast(this.error, "danger");
      } finally { this.loading = false; }
    },
  }
};