const CompanyDashboard = {
  template: `
  <div class="container py-4">

    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div>
        <h2 class="mb-0">{{ company.name || '...' }}</h2>
        <p class="text-muted mb-0" style="font-size:.9rem">
          {{ company.industry || 'Company' }} · {{ company.location || '' }}
        </p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreateDrive">
        <i class="bi bi-plus-circle me-1"></i>Create drive
      </button>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-pills mb-4" style="gap:.5rem">
      <li v-for="t in tabs" :key="t.key">
        <button :class="['btn btn-sm', activeTab===t.key ? 'btn-primary' : 'btn-outline-secondary']"
          @click="activeTab=t.key">
          <i :class="t.icon+' me-1'"></i>{{ t.label }}
        </button>
      </li>
    </ul>

    <!-- ── TAB: Overview ───────────────────────────────────── -->
    <div v-if="activeTab==='overview'">
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3" v-for="s in statCards" :key="s.label">
          <div class="stat-card">
            <div class="stat-icon" :style="{background:s.bg}">
              <i :class="s.icon" :style="{color:s.color}"></i>
            </div>
            <div>
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent drives -->
      <div class="pp-card mb-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h6 class="mb-0 fw-600">Recent drives</h6>
          <button class="btn btn-sm btn-outline-primary" @click="activeTab='drives'">View all</button>
        </div>
        <div v-if="loadingDash" class="pp-spinner"><div class="spinner-border spinner-border-sm"></div></div>
        <div v-else-if="recentDrives.length===0" class="empty-state">
          <i class="bi bi-briefcase"></i>No drives yet.
          <button class="btn btn-sm btn-primary mt-2" @click="openCreateDrive">Create your first drive</button>
        </div>
        <table v-else class="pp-table">
          <thead><tr><th>Drive</th><th>Deadline</th><th>Applicants</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in recentDrives" :key="d.id">
              <td class="fw-500">{{ d.title }}</td>
              <td style="font-size:.85rem">{{ formatDate(d.application_deadline) }}</td>
              <td>{{ d.applicant_count }}</td>
              <td><span :class="'status-badge '+d.status">{{ d.status }}</span></td>
              <td>
                <button class="btn btn-sm btn-outline-primary"
                  @click="viewDrive(d)">Manage</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: Drives ─────────────────────────────────────── -->
    <div v-if="activeTab==='drives'">
      <div class="pp-card mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <select v-model="driveStatusFilter" class="form-select" @change="fetchDrives">
              <option value="">All statuses</option>
              <option value="pending">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div class="col-md-8 text-end">
            <button class="btn btn-primary btn-sm" @click="openCreateDrive">
              <i class="bi bi-plus-circle me-1"></i>New drive
            </button>
          </div>
        </div>
      </div>

      <div v-if="loadingDrives" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="drives.length===0" class="empty-state pp-card">
        <i class="bi bi-briefcase"></i>No drives found
      </div>
      <div v-else class="d-flex flex-column gap-3">
        <div v-for="d in drives" :key="d.id" class="pp-card">
          <div class="d-flex align-items-start justify-content-between gap-3 flex-wrap">
            <div>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-500">{{ d.title }}</span>
                <span v-if="d.job_type" class="badge bg-light text-dark border"
                  style="font-size:.72rem">{{ d.job_type }}</span>
                <span :class="'status-badge '+d.status">{{ d.status }}</span>
              </div>
              <div class="text-muted mt-1" style="font-size:.83rem">
                <span v-if="d.location"><i class="bi bi-geo-alt me-1"></i>{{ d.location }}</span>
                <span v-if="d.salary_lpa" class="ms-3 text-success fw-500">₹{{ d.salary_lpa }} LPA</span>
              </div>
              <div class="mt-2 d-flex flex-wrap gap-2" style="font-size:.8rem">
                <span class="badge bg-light text-muted border">
                  <i class="bi bi-people me-1"></i>{{ d.applicant_count }} applicants
                </span>
                <span class="badge bg-light text-muted border">
                  <i class="bi bi-calendar me-1"></i>Due {{ formatDate(d.application_deadline) }}
                </span>
                <span class="badge bg-light text-muted border">
                  <i class="bi bi-graph-up me-1"></i>Min CGPA {{ d.min_cgpa || 0 }}
                </span>
              </div>
              <div v-if="d.status==='rejected' && d.rejection_reason"
                class="mt-2 text-danger" style="font-size:.8rem">
                <i class="bi bi-x-circle me-1"></i>Rejected: {{ d.rejection_reason }}
              </div>
            </div>
            <div class="d-flex gap-2 flex-shrink-0">
              <button class="btn btn-sm btn-outline-primary" @click="viewDrive(d)">
                <i class="bi bi-people me-1"></i>Applications
              </button>
              <button v-if="d.status!=='closed'" class="btn btn-sm btn-outline-secondary"
                @click="openEditDrive(d)">
                <i class="bi bi-pencil"></i>
              </button>
              <button v-if="d.status==='approved'" class="btn btn-sm btn-outline-danger"
                @click="closeDrive(d)">
                <i class="bi bi-lock me-1"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: Applications (for selected drive) ──────────── -->
    <div v-if="activeTab==='applications'">
      <div class="d-flex align-items-center gap-2 mb-3">
        <button class="btn btn-sm btn-outline-secondary" @click="activeTab='drives'">
          <i class="bi bi-arrow-left me-1"></i>Back
        </button>
        <h6 class="mb-0 fw-600">{{ selectedDrive?.title }} — Applications</h6>
        <span :class="'status-badge '+selectedDrive?.status">{{ selectedDrive?.status }}</span>
      </div>

      <div class="pp-card mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <select v-model="appStatusFilter" class="form-select" @change="fetchApplications">
              <option value="">All statuses</option>
              <option v-for="s in appStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="col-md-8 text-end" v-if="selectedApps.length > 0">
            <div class="d-inline-flex gap-2 align-items-center">
              <select v-model="bulkStatus" class="form-select form-select-sm" style="width:150px">
                <option value="">Bulk update...</option>
                <option v-for="s in appStatuses" :key="s" :value="s">{{ s }}</option>
              </select>
              <button class="btn btn-sm btn-primary" @click="bulkUpdate"
                :disabled="!bulkStatus || selectedApps.length===0">
                Apply to {{ selectedApps.length }} selected
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingApps" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="applications.length===0" class="empty-state pp-card">
        <i class="bi bi-inbox"></i>No applications yet for this drive
      </div>
      <div v-else class="d-flex flex-column gap-3">
        <div v-for="a in applications" :key="a.id" class="pp-card">
          <div class="d-flex align-items-start gap-3 flex-wrap">
            <!-- Checkbox for bulk -->
            <input type="checkbox" class="form-check-input mt-1 flex-shrink-0"
              :value="a.id" v-model="selectedApps"/>

            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-500">{{ a.student_name }}</span>
                <span :class="'status-badge '+a.status">{{ a.status }}</span>
              </div>
              <div class="text-muted mt-1" style="font-size:.83rem">
                Applied {{ formatDate(a.applied_at) }}
                <span v-if="a.interview_date" class="ms-3">
                  <i class="bi bi-camera-video me-1"></i>
                  Interview: {{ formatDate(a.interview_date) }}
                </span>
              </div>
              <div v-if="a.remarks" class="mt-1 text-muted" style="font-size:.82rem">
                <i class="bi bi-chat-left-text me-1"></i>{{ a.remarks }}
              </div>
            </div>

            <!-- Per-application update -->
            <div class="d-flex gap-2 align-items-center flex-shrink-0 flex-wrap">
              <select class="form-select form-select-sm" style="width:140px"
                :value="a.status" @change="e => updateAppStatus(a, e.target.value)">
                <option v-for="s in appStatuses" :key="s" :value="s">{{ s }}</option>
              </select>
              <button
                v-if="['shortlisted','waiting','selected'].includes(a.status)"
                class="btn btn-sm btn-outline-success"
                @click="sendOfferLetter(a)"
              >
                <i class="bi bi-envelope-paper me-1"></i>Offer
              </button>
              <button class="btn btn-sm btn-outline-secondary"
                @click="openScheduleModal(a)">
                <i class="bi bi-calendar-event"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: History ────────────────────────────────────── -->
    <div v-if="activeTab==='history'">
      <div v-if="loadingHistory" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else>
        <div class="pp-card mb-3 d-flex align-items-center gap-3">
          <div class="stat-icon" style="background:#dcfce7">
            <i class="bi bi-trophy-fill" style="color:#166534"></i>
          </div>
          <div>
            <div class="stat-value">{{ history.length }}</div>
            <div class="stat-label">Total students selected</div>
          </div>
        </div>
        <div v-if="history.length===0" class="empty-state pp-card">
          <i class="bi bi-people"></i>No students selected yet
        </div>
        <div v-else class="pp-card">
          <table class="pp-table">
            <thead>
              <tr><th>Student</th><th>Drive</th><th>Interview</th><th>Selected on</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in history" :key="a.id">
                <td class="fw-500">{{ a.student_name }}</td>
                <td>{{ a.drive_title }}</td>
                <td>{{ a.interview_type || '—' }}</td>
                <td style="font-size:.85rem">{{ formatDate(a.updated_at || a.applied_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── TAB: Profile ────────────────────────────────────── -->
    <div v-if="activeTab==='profile'">
      <div class="row g-4">
        <div class="col-md-6">
          <div class="pp-card">
            <h6 class="fw-600 mb-3">Company details</h6>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea v-model="profileForm.description" class="form-control" rows="3"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">Website</label>
              <input v-model="profileForm.website" class="form-control" placeholder="https://..."/>
            </div>
            <div class="mb-3">
              <label class="form-label">Industry</label>
              <input v-model="profileForm.industry" class="form-control"/>
            </div>
            <div class="mb-4">
              <label class="form-label">Location</label>
              <input v-model="profileForm.location" class="form-control"/>
            </div>
            <button class="btn btn-primary w-100" @click="saveProfile" :disabled="savingProfile">
              <span v-if="savingProfile" class="spinner-border spinner-border-sm me-2"></span>
              Save changes
            </button>
          </div>
        </div>
        <div class="col-md-6">
          <div class="pp-card">
            <h6 class="fw-600 mb-3">HR contact</h6>
            <div class="mb-3">
              <label class="form-label">HR name</label>
              <input v-model="profileForm.hr_name" class="form-control"/>
            </div>
            <div class="mb-3">
              <label class="form-label">HR email</label>
              <input v-model="profileForm.hr_email" type="email" class="form-control"/>
            </div>
            <div class="mb-3">
              <label class="form-label">HR phone</label>
              <input v-model="profileForm.hr_phone" class="form-control"/>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create/Edit Drive Modal ─────────────────────────── -->
    <div v-if="driveModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto">
      <div class="pp-card" style="width:100%;max-width:580px;margin:auto">
        <h6 class="fw-600 mb-4">{{ driveModal.editing ? 'Edit drive' : 'Create new drive' }}</h6>
        <p class="form-legend">Fields marked with * are required.</p>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label label-required">Drive title</label>
            <input
              v-model="driveForm.title"
              :class="['form-control', { 'is-invalid': driveValidation.submitted && !driveForm.title }]"
              placeholder="e.g. Software Engineer Intern"
              required
            />
          </div>
          <div class="col-12">
            <label class="form-label label-required">Job description</label>
            <textarea
              v-model="driveForm.description"
              :class="['form-control', { 'is-invalid': driveValidation.submitted && !driveForm.description }]"
              rows="3"
              required
            ></textarea>
          </div>
          <div class="col-md-6">
            <label class="form-label">Job type</label>
            <select v-model="driveForm.job_type" class="form-select">
              <option value="">Select...</option>
              <option value="full-time">Full-time</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Location</label>
            <input v-model="driveForm.location" class="form-control" placeholder="Chennai / Remote"/>
          </div>
          <div class="col-md-6">
            <label class="form-label">Salary (LPA)</label>
            <input v-model.number="driveForm.salary_lpa" type="number" step="0.5" class="form-control"/>
            <div class="field-hint">Optional. Keep blank if not disclosed.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Min CGPA</label>
            <input v-model.number="driveForm.min_cgpa" type="number" step="0.1" min="0" max="10"
              class="form-control"/>
          </div>
          <div class="col-md-6">
            <label class="form-label">Eligible branches</label>
            <input v-model="driveForm.eligible_branches" class="form-control"
              placeholder="CS,IT,ECE (comma separated)"/>
          </div>
          <div class="col-md-6">
            <label class="form-label">Eligible years</label>
            <input v-model="driveForm.eligible_years" class="form-control"
              placeholder="3,4 (comma separated)"/>
          </div>
          <div class="col-md-6">
            <label class="form-label label-required">Application deadline</label>
            <input
              v-model="driveForm.application_deadline"
              :class="['form-control', { 'is-invalid': driveValidation.submitted && !driveForm.application_deadline }]"
              type="datetime-local"
              required
            />
            <div class="field-hint">Must be a future date/time.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Drive date</label>
            <input v-model="driveForm.drive_date" type="datetime-local" class="form-control"/>
          </div>
        </div>
        <div class="d-flex gap-2 justify-content-end mt-4">
          <button class="btn btn-outline-secondary" @click="driveModal.show=false">Cancel</button>
          <button class="btn btn-primary" @click="saveDrive" :disabled="savingDrive">
            <span v-if="savingDrive" class="spinner-border spinner-border-sm me-2"></span>
            {{ driveModal.editing ? 'Update drive' : 'Create drive' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Schedule Interview Modal ────────────────────────── -->
    <div v-if="scheduleModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem">
      <div class="pp-card" style="width:100%;max-width:420px">
        <h6 class="fw-600 mb-3">Schedule interview — {{ scheduleModal.app?.student_name }}</h6>
        <div class="mb-3">
          <label class="form-label">Interview type</label>
          <select v-model="scheduleForm.interview_type" class="form-select">
            <option value="in-person">In-person</option>
            <option value="online">Online</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Interview date & time</label>
          <input v-model="scheduleForm.interview_date" type="datetime-local" class="form-control"/>
        </div>
        <div class="mb-4">
          <label class="form-label">Remarks</label>
          <input v-model="scheduleForm.remarks" class="form-control" placeholder="Any notes..."/>
        </div>
        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-outline-secondary" @click="scheduleModal.show=false">Cancel</button>
          <button class="btn btn-primary" @click="saveSchedule">Save</button>
        </div>
      </div>
    </div>

  </div>
  `,

  data() {
    return {
      activeTab: "overview",
      tabs: [
        { key: "overview",  label: "Overview",     icon: "bi bi-speedometer2" },
        { key: "drives",    label: "Drives",        icon: "bi bi-briefcase" },
        { key: "history",   label: "Hired",         icon: "bi bi-trophy" },
        { key: "profile",   label: "Profile",       icon: "bi bi-building-gear" },
      ],
      company:       {},
      stats:         {},
      recentDrives:  [],
      drives:        [],
      applications:  [],
      history:       [],
      selectedDrive: null,
      selectedApps:  [],
      bulkStatus:    "",
      loadingDash:   true,
      loadingDrives: false,
      loadingApps:   false,
      loadingHistory:false,
      savingProfile: false,
      savingDrive:   false,
      _refreshTimer: null,
      _onWindowFocus: null,
      driveValidation: { submitted: false },
      driveStatusFilter: "",
      appStatusFilter:   "",
      appStatuses: ["applied","shortlisted","waiting","offered","hired","selected","offer_declined","rejected"],
      profileForm: { description:"", website:"", industry:"", location:"", hr_name:"", hr_email:"", hr_phone:"" },
      driveForm:   { title:"", description:"", job_type:"", location:"", salary_lpa:"", min_cgpa:0,
                     eligible_branches:"", eligible_years:"", application_deadline:"", drive_date:"" },
      driveModal:    { show: false, editing: false, driveId: null },
      scheduleModal: { show: false, app: null },
      scheduleForm:  { interview_type: "in-person", interview_date: "", remarks: "" },
      alert: { msg: "", type: "success" },
    };
  },

  watch: {
    activeTab(tab) {
      if (tab === "drives")  this.fetchDrives();
      if (tab === "history") this.fetchHistory();
    }
  },

  async mounted() {
    await this.fetchDashboard();
    this._onWindowFocus = () => this.refreshCurrentView(true);
    window.addEventListener("focus", this._onWindowFocus);
    this._refreshTimer = setInterval(() => this.refreshCurrentView(true), 30000);
  },

  beforeUnmount() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    if (this._onWindowFocus) window.removeEventListener("focus", this._onWindowFocus);
  },

  methods: {
    async refreshCurrentView(silent = false) {
      await this.fetchDashboard(silent);
      if (this.activeTab === "drives") await this.fetchDrives(silent);
      if (this.activeTab === "applications") await this.fetchApplications(silent);
      if (this.activeTab === "history") await this.fetchHistory(silent);
    },

    async fetchDashboard(silent = false) {
      this.loadingDash = true;
      try {
        const { data } = await ApiService.companyDashboard();
        this.company      = data.company;
        this.stats        = data.stats;
        this.recentDrives = data.recent_drives;
        this.profileForm  = {
          description: this.company.description || "",
          website:     this.company.website     || "",
          industry:    this.company.industry    || "",
          location:    this.company.location    || "",
          hr_name:     this.company.hr_name     || "",
          hr_email:    this.company.hr_email    || "",
          hr_phone:    this.company.hr_phone    || "",
        };
      } catch {
        if (!silent) this.showAlert("Failed to load dashboard", "danger");
      }
      finally  { this.loadingDash = false; }
    },

    async fetchDrives(silent = false) {
      this.loadingDrives = true;
      try {
        const params = this.driveStatusFilter ? { status: this.driveStatusFilter } : {};
        const { data } = await ApiService.companyDrives(params);
        this.drives = data.drives;
      } catch {
        if (!silent) this.showAlert("Failed to load drives", "danger");
      }
      finally  { this.loadingDrives = false; }
    },

    async fetchApplications(silent = false) {
      if (!this.selectedDrive) return;
      this.loadingApps = true;
      this.selectedApps = [];
      try {
        const params = this.appStatusFilter ? { status: this.appStatusFilter } : {};
        const { data } = await ApiService.companyApplications(this.selectedDrive.id, params);
        this.applications = data.applications;
      } catch {
        if (!silent) this.showAlert("Failed to load applications", "danger");
      }
      finally  { this.loadingApps = false; }
    },

    async fetchHistory(silent = false) {
      this.loadingHistory = true;
      try {
        const { data } = await ApiService.companyHistory();
        this.history = data.history;
      } catch {
        if (!silent) this.showAlert("Failed to load history", "danger");
      }
      finally  { this.loadingHistory = false; }
    },

    viewDrive(drive) {
      this.selectedDrive = drive;
      this.appStatusFilter = "";
      this.activeTab = "applications";
      this.fetchApplications();
    },

    // ── Drive CRUD ──
    openCreateDrive() {
      this.driveForm = { title:"", description:"", job_type:"", location:"",
        salary_lpa:"", min_cgpa:0, eligible_branches:"", eligible_years:"",
        application_deadline:"", drive_date:"" };
      this.driveValidation.submitted = false;
      this.driveModal = { show: true, editing: false, driveId: null };
    },

    openEditDrive(drive) {
      const fmt = dt => dt ? new Date(dt).toISOString().slice(0,16) : "";
      this.driveForm = {
        title:                drive.title,
        description:          drive.description,
        job_type:             drive.job_type        || "",
        location:             drive.location        || "",
        salary_lpa:           drive.salary_lpa      || "",
        min_cgpa:             drive.min_cgpa        || 0,
        eligible_branches:    Array.isArray(drive.eligible_branches)
                                ? drive.eligible_branches.join(",")
                                : (drive.eligible_branches || ""),
        eligible_years:       Array.isArray(drive.eligible_years)
                                ? drive.eligible_years.join(",")
                                : (drive.eligible_years || ""),
        application_deadline: fmt(drive.application_deadline),
        drive_date:           fmt(drive.drive_date),
      };
      this.driveValidation.submitted = false;
      this.driveModal = { show: true, editing: true, driveId: drive.id };
    },

    async saveDrive() {
      this.driveValidation.submitted = true;
      if (!this.driveForm.title || !this.driveForm.description || !this.driveForm.application_deadline) {
        return this.showAlert("Title, description and deadline are required", "danger");
      }
      this.savingDrive = true;
      const payload = { ...this.driveForm,
        application_deadline: new Date(this.driveForm.application_deadline).toISOString(),
        drive_date: this.driveForm.drive_date
          ? new Date(this.driveForm.drive_date).toISOString() : undefined,
      };
      try {
        if (this.driveModal.editing) {
          await ApiService.companyUpdateDrive(this.driveModal.driveId, payload);
          this.showAlert("Drive updated and resubmitted for approval", "success");
        } else {
          await ApiService.companyCreateDrive(payload);
          this.showAlert("Drive created and sent for admin approval", "success");
        }
        this.driveModal.show = false;
        await this.refreshCurrentView(true);
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed to save drive", "danger");
      } finally { this.savingDrive = false; }
    },

    async closeDrive(drive) {
      if (!confirm(`Close drive "${drive.title}"? Students won't be able to apply.`)) return;
      try {
        await ApiService.companyCloseDrive(drive.id);
        drive.status = "closed";
        this.showAlert("Drive closed", "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Application actions ──
    async updateAppStatus(app, status) {
      try {
        await ApiService.companyUpdateApp(app.id, { status });
        app.status = status;
        await this.refreshCurrentView(true);
        this.showAlert(`Status updated to "${status}"`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    async sendOfferLetter(app) {
      const offerLetterUrl = prompt("Enter offer letter URL (PDF/Drive link):");
      if (!offerLetterUrl) return;
      const note = prompt("Optional message for candidate:") || "";
      try {
        await ApiService.companySendOffer(app.id, {
          offer_letter_url: offerLetterUrl,
          message: note,
        });
        app.status = "offered";
        app.remarks = offerLetterUrl;
        await this.refreshCurrentView(true);
        this.showAlert("Offer letter sent and status updated to offered", "success");
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed to send offer letter", "danger");
      }
    },

    async bulkUpdate() {
      if (!this.bulkStatus || this.selectedApps.length === 0) return;
      try {
        await ApiService.companyBulkUpdate(this.selectedDrive.id, {
          application_ids: this.selectedApps,
          status: this.bulkStatus,
        });
        this.applications.forEach(a => {
          if (this.selectedApps.includes(a.id)) a.status = this.bulkStatus;
        });
        this.selectedApps = [];
        this.bulkStatus   = "";
        await this.refreshCurrentView(true);
        this.showAlert("Bulk update applied", "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    openScheduleModal(app) {
      this.scheduleModal = { show: true, app };
      this.scheduleForm  = { interview_type: "in-person", interview_date: "", remarks: "" };
    },

    async saveSchedule() {
      const app = this.scheduleModal.app;
      const payload = {
        status:         "shortlisted",
        interview_type: this.scheduleForm.interview_type,
        interview_date: this.scheduleForm.interview_date
          ? new Date(this.scheduleForm.interview_date).toISOString() : undefined,
        remarks:        this.scheduleForm.remarks,
      };
      try {
        await ApiService.companyUpdateApp(app.id, payload);
        Object.assign(app, payload);
        this.scheduleModal.show = false;
        await this.refreshCurrentView(true);
        this.showAlert("Interview scheduled and student shortlisted", "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    async saveProfile() {
      this.savingProfile = true;
      try {
        await ApiService.companyUpdateProfile(this.profileForm);
        Object.assign(this.company, this.profileForm);
        this.showAlert("Profile updated", "success");
      } catch { this.showAlert("Failed to update profile", "danger"); }
      finally  { this.savingProfile = false; }
    },

    formatDate(dt) {
      if (!dt) return "—";
      return new Date(dt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
    },

    showAlert(msg, type = "success") {
      if (typeof window.ppToast === "function") {
        window.ppToast(msg, type);
      }
    },
  }
};