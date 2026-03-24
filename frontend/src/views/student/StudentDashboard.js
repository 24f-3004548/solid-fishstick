const StudentDashboard = {
  template: `
  <div class="container py-4">

    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div>
        <h2 class="mb-0">Welcome, {{ student.full_name || '...' }}</h2>
        <p class="text-muted mb-0" style="font-size:.9rem">
          {{ student.branch }} · Year {{ student.year }} · CGPA {{ student.cgpa }}
        </p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="activeTab='profile'">
          <i class="bi bi-person-gear me-1"></i>Profile
        </button>
        <button class="btn btn-sm btn-outline-primary" @click="exportCSV" :disabled="exporting">
          <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-download me-1"></i>Export history
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-pills mb-4" style="gap:.5rem">
      <li class="nav-item" v-for="t in tabs" :key="t.key">
        <button :class="['btn btn-sm', activeTab===t.key ? 'btn-primary' : 'btn-outline-secondary']"
          @click="activeTab=t.key">
          <i :class="t.icon+' me-1'"></i>{{ t.label }}
          <span v-if="t.key==='drives' && stats.eligible_drives > 0"
            class="badge bg-danger ms-1" style="font-size:.65rem">
            {{ stats.eligible_drives }}
          </span>
        </button>
      </li>
    </ul>

    <!-- ── TAB: Overview ─────────────────────────────────────── -->
    <div v-if="activeTab==='overview'">

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3" v-for="s in statCards" :key="s.label">
          <div class="stat-card">
            <div class="stat-icon" :style="{background: s.bg}">
              <i :class="s.icon" :style="{color: s.color}"></i>
            </div>
            <div>
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Eligible drives preview -->
      <div class="pp-card mb-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h6 class="mb-0 fw-600">Open drives for you</h6>
          <button class="btn btn-sm btn-outline-primary" @click="activeTab='drives'">
            View all
          </button>
        </div>
        <div v-if="loadingDash" class="pp-spinner"><div class="spinner-border spinner-border-sm"></div></div>
        <div v-else-if="eligibleDrives.length===0" class="empty-state">
          <i class="bi bi-briefcase"></i>
          No open drives matching your profile right now
        </div>
        <div v-else class="d-flex flex-column gap-2">
          <div v-for="d in eligibleDrives.slice(0,4)" :key="d.id" class="drive-card">
            <div class="d-flex align-items-center gap-3">
              <div class="company-logo">{{ d.company_name?.charAt(0) }}</div>
              <div class="flex-grow-1 min-width-0">
                <div class="fw-500">{{ d.title }}</div>
                <div class="text-muted" style="font-size:.82rem">
                  {{ d.company_name }} · {{ d.location || 'Remote' }}
                  <span v-if="d.salary_lpa" class="ms-2">₹{{ d.salary_lpa }} LPA</span>
                </div>
              </div>
              <div class="d-flex flex-column align-items-end gap-1">
                <span class="status-badge approved">open</span>
                <span style="font-size:.75rem;color:var(--text-muted)">
                  Due {{ formatDate(d.application_deadline) }}
                </span>
              </div>
              <button class="btn btn-sm btn-primary" @click="applyDrive(d)"
                :disabled="d.already_applied || applying===d.id">
                <span v-if="applying===d.id" class="spinner-border spinner-border-sm"></span>
                <span v-else>{{ d.already_applied ? 'Applied' : 'Apply' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent applications -->
      <div class="pp-card">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h6 class="mb-0 fw-600">Recent applications</h6>
          <button class="btn btn-sm btn-outline-primary" @click="activeTab='applications'">View all</button>
        </div>
        <div v-if="recentApps.length===0" class="empty-state">
          <i class="bi bi-file-earmark-text"></i>No applications yet
        </div>
        <table v-else class="pp-table">
          <thead>
            <tr>
              <th>Company</th><th>Drive</th><th>Applied</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in recentApps" :key="a.id">
              <td>{{ a.company_name }}</td>
              <td>{{ a.drive_title }}</td>
              <td>{{ formatDate(a.applied_at) }}</td>
              <td><span :class="'status-badge '+a.status">{{ a.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: Browse Drives ────────────────────────────────── -->
    <div v-if="activeTab==='drives'">
      <!-- Filters -->
      <div class="pp-card mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-5">
            <label class="form-label">Search drives</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input v-model="driveSearch" class="form-control" placeholder="Job title, company..."
                @input="debouncedSearch"/>
            </div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Job type</label>
            <select v-model="driveJobType" class="form-select" @change="fetchDrives">
              <option value="">All types</option>
              <option value="full-time">Full-time</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div class="col-md-4">
            <div class="form-check form-switch mt-3">
              <input class="form-check-input" type="checkbox" v-model="eligibleOnly"
                @change="fetchDrives" id="eligSwitch"/>
              <label class="form-check-label" for="eligSwitch">Show only eligible drives</label>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingDrives" class="pp-spinner">
        <div class="spinner-border text-primary"></div> Loading drives...
      </div>

      <div v-else-if="allDrives.length===0" class="empty-state">
        <i class="bi bi-briefcase"></i>No drives found
      </div>

      <div v-else class="d-flex flex-column gap-3">
        <div v-for="d in allDrives" :key="d.id" class="drive-card">
          <div class="d-flex align-items-start gap-3">
            <div class="company-logo flex-shrink-0">{{ d.company_name?.charAt(0) }}</div>
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-500">{{ d.title }}</span>
                <span v-if="d.job_type" class="badge bg-light text-dark border"
                  style="font-size:.72rem">{{ d.job_type }}</span>
                <span v-if="!d.is_eligible" class="badge bg-warning text-dark"
                  style="font-size:.72rem">
                  <i class="bi bi-exclamation-triangle me-1"></i>Not eligible
                </span>
              </div>
              <div class="text-muted mt-1" style="font-size:.83rem">
                {{ d.company_name }}
                <span v-if="d.location"> · {{ d.location }}</span>
                <span v-if="d.salary_lpa" class="ms-2 text-success fw-500">₹{{ d.salary_lpa }} LPA</span>
              </div>
              <div class="mt-2 d-flex flex-wrap gap-2" style="font-size:.8rem">
                <span class="badge bg-light text-muted border">
                  <i class="bi bi-diagram-3 me-1"></i>{{ d.eligible_branches?.join(', ') || 'All branches' }}
                </span>
                <span class="badge bg-light text-muted border">
                  <i class="bi bi-graph-up me-1"></i>Min CGPA {{ d.min_cgpa || 0 }}
                </span>
                <span class="badge bg-light text-muted border">
                  <i class="bi bi-calendar me-1"></i>Due {{ formatDate(d.application_deadline) }}
                </span>
              </div>
              <div v-if="!d.is_eligible && d.ineligible_reason"
                class="mt-2 text-warning" style="font-size:.8rem">
                <i class="bi bi-info-circle me-1"></i>{{ d.ineligible_reason }}
              </div>
            </div>
            <div class="flex-shrink-0">
              <button v-if="d.already_applied" class="btn btn-sm btn-outline-success" disabled>
                <i class="bi bi-check-circle me-1"></i>Applied
              </button>
              <button v-else-if="d.is_eligible"
                class="btn btn-sm btn-primary" @click="applyDrive(d)"
                :disabled="applying===d.id">
                <span v-if="applying===d.id" class="spinner-border spinner-border-sm"></span>
                <span v-else>Apply now</span>
              </button>
              <button v-else class="btn btn-sm btn-outline-secondary" disabled>Not eligible</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: My Applications ──────────────────────────────── -->
    <div v-if="activeTab==='applications'">
      <div class="pp-card mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label">Filter by status</label>
            <select v-model="appStatusFilter" class="form-select" @change="fetchApplications">
              <option value="">All statuses</option>
              <option v-for="s in appStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loadingApps" class="pp-spinner">
        <div class="spinner-border text-primary"></div>
      </div>

      <div v-else-if="myApplications.length===0" class="empty-state pp-card">
        <i class="bi bi-file-earmark-text"></i>
        <p>No applications yet. Browse drives and apply!</p>
        <button class="btn btn-primary btn-sm" @click="activeTab='drives'">Browse drives</button>
      </div>

      <div v-else class="d-flex flex-column gap-3">
        <div v-for="a in myApplications" :key="a.id" class="pp-card">
          <div class="d-flex align-items-start justify-content-between gap-3 flex-wrap">
            <div>
              <div class="fw-500">{{ a.drive_title }}</div>
              <div class="text-muted" style="font-size:.85rem">{{ a.company_name }}</div>
              <div class="mt-2 d-flex flex-wrap gap-2">
                <span :class="'status-badge '+a.status">{{ a.status }}</span>
                <span class="text-muted" style="font-size:.8rem">
                  Applied {{ formatDate(a.applied_at) }}
                </span>
              </div>
              <div v-if="a.interview_date" class="mt-2 text-info" style="font-size:.82rem">
                <i class="bi bi-camera-video me-1"></i>
                Interview: {{ formatDate(a.interview_date) }} ({{ a.interview_type }})
              </div>
              <div v-if="a.remarks" class="mt-1 text-muted" style="font-size:.82rem">
                <i class="bi bi-chat-left-text me-1"></i>{{ a.remarks }}
              </div>
            </div>
            <div class="d-flex flex-column gap-2 align-items-stretch">
              <button
                v-if="a.status==='offered'"
                class="btn btn-sm btn-outline-primary"
                @click="viewOffer(a)"
              >
                <i class="bi bi-file-earmark-text me-1"></i>View offer
              </button>
              <button
                v-if="a.status==='offered'"
                class="btn btn-sm btn-success"
                @click="respondToOffer(a, 'accept')"
              >
                <i class="bi bi-check2-circle me-1"></i>Accept offer
              </button>
              <button
                v-if="a.status==='offered'"
                class="btn btn-sm btn-outline-danger"
                @click="respondToOffer(a, 'reject')"
              >
                <i class="bi bi-x-circle me-1"></i>Decline offer
              </button>
              <button v-if="a.status==='applied'" class="btn btn-sm btn-outline-danger"
                @click="withdrawApp(a)">
                <i class="bi bi-x-circle me-1"></i>Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: History ──────────────────────────────────────── -->
    <div v-if="activeTab==='history'">
      <div v-if="loadingHistory" class="pp-spinner">
        <div class="spinner-border text-primary"></div>
      </div>
      <div v-else>
        <!-- Summary pills -->
        <div class="d-flex gap-2 flex-wrap mb-4">
          <div v-for="s in historySummary" :key="s.label"
            class="pp-card d-flex align-items-center gap-2 py-2 px-3">
            <span :class="'status-badge '+s.key">{{ s.value }}</span>
            <span style="font-size:.85rem">{{ s.label }}</span>
          </div>
        </div>

        <div v-if="history.length===0" class="empty-state pp-card">
          <i class="bi bi-clock-history"></i>No placement history yet
        </div>

        <div v-else class="pp-card">
          <table class="pp-table">
            <thead>
              <tr>
                <th>#</th><th>Company</th><th>Drive</th>
                <th>Interview</th><th>Applied</th><th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a,i) in history" :key="a.id">
                <td class="text-muted">{{ i+1 }}</td>
                <td>{{ a.company_name }}</td>
                <td>{{ a.drive_title }}</td>
                <td>{{ a.interview_type || '—' }}</td>
                <td>{{ formatDate(a.applied_at) }}</td>
                <td><span :class="'status-badge '+a.status">{{ a.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── TAB: Profile ──────────────────────────────────────── -->
    <div v-if="activeTab==='profile'">
      <div class="row g-4">
        <div class="col-md-6">
          <div class="pp-card">
            <h6 class="fw-600 mb-3">Personal details</h6>
            <div class="mb-3">
              <label class="form-label label-required">Full name</label>
              <input v-model="profileForm.full_name" class="form-control" readonly disabled />
              <div class="readonly-hint">Locked after registration.</div>
            </div>
            <div class="mb-3">
              <label class="form-label label-required">Phone</label>
              <input v-model="profileForm.phone" class="form-control" placeholder="+91 XXXXXXXXXX" required />
              <div class="field-hint">Use an active number for recruiter contact.</div>
            </div>
            <div class="mb-4">
              <label class="form-label label-required">Date of birth</label>
              <input v-model="profileForm.dob" type="date" class="form-control" readonly disabled />
              <div class="readonly-hint">Locked after registration.</div>
            </div>
            <button class="btn btn-primary w-100" @click="saveProfile" :disabled="savingProfile">
              <span v-if="savingProfile" class="spinner-border spinner-border-sm me-2"></span>
              Save changes
            </button>
          </div>
        </div>
        <div class="col-md-6">
          <div class="pp-card">
            <h6 class="fw-600 mb-3">Resume</h6>
            <div v-if="student.resume_path" class="pp-alert alert-success mb-3">
              <i class="bi bi-file-earmark-pdf-fill me-2"></i>
              Resume uploaded: {{ student.resume_path }}
            </div>
            <div v-else class="pp-alert alert-warning mb-3">
              <i class="bi bi-exclamation-triangle me-2"></i>
              No resume uploaded yet
            </div>
            <label class="form-label">Upload PDF resume</label>
            <input type="file" class="form-control mb-3" accept=".pdf"
              @change="e => resumeFile = e.target.files[0]"/>
            <button class="btn btn-outline-primary w-100" @click="uploadResume"
              :disabled="!resumeFile || uploadingResume">
              <span v-if="uploadingResume" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-cloud-upload me-2"></i>Upload resume
            </button>
          </div>
          <div class="pp-card mt-3">
            <h6 class="fw-600 mb-3">Academic info</h6>
            <div class="row g-2" style="font-size:.9rem">
              <div class="col-6">
                <div class="text-muted">Roll number</div>
                <div class="fw-500">{{ student.roll_number }}</div>
              </div>
              <div class="col-6">
                <div class="text-muted">Branch</div>
                <div class="fw-500">{{ student.branch }}</div>
              </div>
              <div class="col-6">
                <div class="text-muted">Year</div>
                <div class="fw-500">{{ student.year }}</div>
              </div>
              <div class="col-6">
                <div class="text-muted">CGPA</div>
                <div class="fw-500">{{ student.cgpa }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
  `,

  data() {
    return {
      activeTab: "overview",
      tabs: [
        { key: "overview",      label: "Overview",      icon: "bi bi-house" },
        { key: "drives",        label: "Browse drives", icon: "bi bi-briefcase" },
        { key: "applications",  label: "Applications",  icon: "bi bi-file-earmark-text" },
        { key: "history",       label: "History",       icon: "bi bi-clock-history" },
        { key: "profile",       label: "Profile",       icon: "bi bi-person" },
      ],
      student:       {},
      stats:         { total_applied: 0, shortlisted: 0, selected: 0, rejected: 0, eligible_drives: 0 },
      eligibleDrives: [],
      recentApps:    [],
      allDrives:     [],
      myApplications:[],
      history:       [],
      loadingDash:   true,
      loadingDrives: false,
      loadingApps:   false,
      loadingHistory:false,
      applying:      null,
      exporting:     false,
      driveSearch:   "",
      driveJobType:  "",
      eligibleOnly:  false,
      appStatusFilter: "",
      appStatuses:   ["applied","shortlisted","waiting","offered","hired","selected","offer_declined","rejected"],
      profileForm:   { full_name: "", phone: "", dob: "" },
      savingProfile: false,
      resumeFile:    null,
      uploadingResume: false,
      alert:         { msg: "", type: "success" },
      _searchTimer:  null,
      _refreshTimer: null,
      _onWindowFocus: null,
    };
  },

  computed: {
    statCards() {
      return [
        { label: "Applied",     value: this.stats.total_applied, icon: "bi bi-send-fill",      bg: "#eff6ff", color: "#1d4ed8" },
        { label: "Shortlisted", value: this.stats.shortlisted,   icon: "bi bi-star-fill",      bg: "#fef3c7", color: "#92400e" },
        { label: "Selected",    value: this.stats.selected,      icon: "bi bi-trophy-fill",    bg: "#dcfce7", color: "#166534" },
        { label: "Rejected",    value: this.stats.rejected,      icon: "bi bi-x-circle-fill",  bg: "#fee2e2", color: "#991b1b" },
      ];
    },
    historySummary() {
      const h = this.history;
      return [
        { key: "applied",     label: "Total applied",  value: h.length },
        { key: "offered",     label: "Offered",        value: h.filter(a=>a.status==="offered").length },
        { key: "hired",       label: "Hired",          value: h.filter(a=>a.status==="hired").length },
        { key: "offer_declined", label: "Declined",    value: h.filter(a=>a.status==="offer_declined").length },
        { key: "selected",    label: "Selected",       value: h.filter(a=>a.status==="selected").length },
        { key: "shortlisted", label: "Shortlisted",    value: h.filter(a=>a.status==="shortlisted").length },
        { key: "rejected",    label: "Rejected",       value: h.filter(a=>a.status==="rejected").length },
      ];
    }
  },

  watch: {
    activeTab(tab) {
      if (tab === "drives")       this.fetchDrives();
      if (tab === "applications") this.fetchApplications();
      if (tab === "history")      this.fetchHistory();
    }
  },

  async mounted() {
    await this.fetchDashboard();
    this._onWindowFocus = () => this.refreshCurrentView(true);
    window.addEventListener("focus", this._onWindowFocus);
    this._refreshTimer = setInterval(() => this.refreshCurrentView(true), 30000);
  },

  beforeUnmount() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
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
        const { data } = await ApiService.studentDashboard();
        this.student        = data.student;
        this.stats          = data.stats;
        this.eligibleDrives = data.eligible_drives || [];
        this.recentApps     = data.recent_applications || [];
        this.stats.eligible_drives = this.eligibleDrives.length;
        this.profileForm.full_name = this.student.full_name;
        this.profileForm.phone     = this.student.phone || "";
        this.profileForm.dob       = this.student.dob   || "";
      } catch {
        if (!silent) this.showAlert("Failed to load dashboard", "danger");
      }
      finally  { this.loadingDash = false; }
    },

    async fetchDrives(silent = false) {
      this.loadingDrives = true;
      try {
        const params = {};
        if (this.driveSearch)  params.search       = this.driveSearch;
        if (this.driveJobType) params.job_type      = this.driveJobType;
        if (this.eligibleOnly) params.eligible_only = "true";
        const { data } = await ApiService.studentDrives(params);
        this.allDrives = data.drives;
      } catch {
        if (!silent) this.showAlert("Failed to load drives", "danger");
      }
      finally  { this.loadingDrives = false; }
    },

    debouncedSearch() {
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => this.fetchDrives(), 400);
    },

    async fetchApplications(silent = false) {
      this.loadingApps = true;
      try {
        const params = this.appStatusFilter ? { status: this.appStatusFilter } : {};
        const { data } = await ApiService.studentApplications(params);
        this.myApplications = data.applications;
      } catch {
        if (!silent) this.showAlert("Failed to load applications", "danger");
      }
      finally  { this.loadingApps = false; }
    },

    async fetchHistory(silent = false) {
      this.loadingHistory = true;
      try {
        const { data } = await ApiService.studentHistory();
        this.history = data.history;
      } catch {
        if (!silent) this.showAlert("Failed to load history", "danger");
      }
      finally  { this.loadingHistory = false; }
    },

    async applyDrive(drive) {
      this.applying = drive.id;
      try {
        await ApiService.studentApply(drive.id);
        drive.already_applied = true;
        this.stats.total_applied++;
        await this.refreshCurrentView(true);
        this.showAlert(`Applied to "${drive.title}" successfully!`, "success");
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed to apply", "danger");
      } finally { this.applying = null; }
    },

    async withdrawApp(app) {
      if (!confirm(`Withdraw application for "${app.drive_title}"?`)) return;
      try {
        await ApiService.studentWithdraw(app.id);
        this.myApplications = this.myApplications.filter(a => a.id !== app.id);
        this.stats.total_applied--;
        await this.refreshCurrentView(true);
        this.showAlert("Application withdrawn", "success");
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Cannot withdraw", "danger");
      }
    },

    viewOffer(app) {
      const text = app.remarks || "No offer document link provided.";
      const match = text.match(/https?:\/\/\S+/i);
      if (match && confirm("Open offer document link in a new tab?")) {
        window.open(match[0], "_blank", "noopener,noreferrer");
        return;
      }
      this.showAlert(text, "info");
    },

    async respondToOffer(app, decision) {
      const isAccept = decision === "accept";
      const actionText = isAccept ? "accept" : "decline";
      if (!confirm(`Are you sure you want to ${actionText} this offer?`)) return;

      let note = "";
      if (!isAccept) {
        note = prompt("Optional: share a reason for declining") || "";
      }

      try {
        const { data } = await ApiService.studentOfferResponse(app.id, { decision, note });
        app.status = data.application?.status || (isAccept ? "hired" : "offer_declined");
        app.remarks = data.application?.remarks || app.remarks;
        await this.refreshCurrentView(true);
        this.showAlert(data.message || `Offer ${isAccept ? "accepted" : "declined"}`, isAccept ? "success" : "warning");
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed to submit offer response", "danger");
      }
    },

    async saveProfile() {
      this.savingProfile = true;
      try {
        const { data } = await ApiService.studentUpdateProfile({ phone: this.profileForm.phone });
        this.student = { ...this.student, ...data.student };
        this.profileForm.full_name = this.student.full_name || "";
        this.profileForm.phone = this.student.phone || "";
        this.profileForm.dob = this.student.dob || "";
        this.showAlert("Profile updated successfully", "success");
      } catch { this.showAlert("Failed to update profile", "danger"); }
      finally  { this.savingProfile = false; }
    },

    async uploadResume() {
      if (!this.resumeFile) return;
      this.uploadingResume = true;
      try {
        await ApiService.studentUploadResume(this.resumeFile);
        this.student.resume_path = this.resumeFile.name;
        this.resumeFile = null;
        this.showAlert("Resume uploaded successfully", "success");
      } catch { this.showAlert("Failed to upload resume", "danger"); }
      finally  { this.uploadingResume = false; }
    },

    async exportCSV() {
      this.exporting = true;
      try {
        await ApiService.studentExport();
        this.showAlert("Export started — you'll receive an email when ready", "success");
      } catch { this.showAlert("Export failed", "danger"); }
      finally  { this.exporting = false; }
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