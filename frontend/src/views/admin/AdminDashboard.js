const AdminDashboard = {
  template: `
  <div class="container py-4">

    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div>
        <h2 class="mb-0">Admin Dashboard</h2>
        <p class="text-muted mb-0" style="font-size:.9rem">Placement Portal Control Centre</p>
      </div>
      <div class="d-flex gap-2">
        <div class="input-group" style="width:260px">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input v-model="globalSearch" class="form-control" placeholder="Search students, companies..."
            @input="debouncedGlobalSearch"/>
        </div>
      </div>
    </div>

    <!-- Alert -->
    <div v-if="alert.msg" :class="['pp-alert alert-'+alert.type+' mb-4']">
      <i :class="alert.type==='success'?'bi bi-check-circle-fill':'bi bi-exclamation-circle-fill'"></i>
      {{ alert.msg }}
    </div>

    <!-- Global search results -->
    <div v-if="searchResults" class="pp-card mb-4">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h6 class="mb-0">Search results for "{{ globalSearch }}"</h6>
        <button class="btn btn-sm btn-outline-secondary" @click="searchResults=null;globalSearch=''">
          <i class="bi bi-x"></i> Clear
        </button>
      </div>
      <div class="row g-3">
        <div class="col-md-4">
          <div class="text-muted fw-500 mb-2" style="font-size:.8rem">STUDENTS</div>
          <div v-if="searchResults.students.length===0" class="text-muted" style="font-size:.85rem">None found</div>
          <div v-for="s in searchResults.students" :key="s.id"
            class="d-flex align-items-center justify-content-between py-2 border-bottom">
            <div>
              <div style="font-size:.9rem;font-weight:500">{{ s.full_name }}</div>
              <div class="text-muted" style="font-size:.78rem">{{ s.roll_number }} · {{ s.branch }}</div>
            </div>
            <span v-if="s.is_blacklisted" class="status-badge rejected">blacklisted</span>
          </div>
        </div>
        <div class="col-md-4">
          <div class="text-muted fw-500 mb-2" style="font-size:.8rem">COMPANIES</div>
          <div v-if="searchResults.companies.length===0" class="text-muted" style="font-size:.85rem">None found</div>
          <div v-for="c in searchResults.companies" :key="c.id"
            class="d-flex align-items-center justify-content-between py-2 border-bottom">
            <div>
              <div style="font-size:.9rem;font-weight:500">{{ c.name }}</div>
              <div class="text-muted" style="font-size:.78rem">{{ c.industry }}</div>
            </div>
            <span :class="'status-badge '+c.approval_status">{{ c.approval_status }}</span>
          </div>
        </div>
        <div class="col-md-4">
          <div class="text-muted fw-500 mb-2" style="font-size:.8rem">DRIVES</div>
          <div v-if="searchResults.drives.length===0" class="text-muted" style="font-size:.85rem">None found</div>
          <div v-for="d in searchResults.drives" :key="d.id"
            class="d-flex align-items-center justify-content-between py-2 border-bottom">
            <div>
              <div style="font-size:.9rem;font-weight:500">{{ d.title }}</div>
              <div class="text-muted" style="font-size:.78rem">{{ d.company_name }}</div>
            </div>
            <span :class="'status-badge '+d.status">{{ d.status }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-pills mb-4" style="gap:.5rem">
      <li v-for="t in tabs" :key="t.key">
        <button :class="['btn btn-sm', activeTab===t.key ? 'btn-primary' : 'btn-outline-secondary']"
          @click="activeTab=t.key">
          <i :class="t.icon+' me-1'"></i>{{ t.label }}
          <span v-if="t.badge" class="badge bg-danger ms-1" style="font-size:.65rem">{{ t.badge }}</span>
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

      <!-- Pending approvals -->
      <div class="row g-4">
        <div class="col-md-6">
          <div class="pp-card h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0 fw-600">Pending companies</h6>
              <button class="btn btn-sm btn-outline-primary" @click="activeTab='companies'">View all</button>
            </div>
            <div v-if="loadingDash" class="pp-spinner"><div class="spinner-border spinner-border-sm"></div></div>
            <div v-else-if="pendingCompanies.length===0" class="empty-state">
              <i class="bi bi-building"></i>No pending approvals
            </div>
            <div v-else class="d-flex flex-column gap-2">
              <div v-for="c in pendingCompanies.slice(0,4)" :key="c.id"
                class="d-flex align-items-center justify-content-between p-2 rounded"
                style="background:var(--surface-2)">
                <div>
                  <div style="font-weight:500;font-size:.9rem">{{ c.name }}</div>
                  <div class="text-muted" style="font-size:.78rem">{{ c.hr_email }}</div>
                </div>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-success" @click="approveCompany(c)">
                    <i class="bi bi-check"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" @click="openRejectModal('company', c)">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="pp-card h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0 fw-600">Pending drives</h6>
              <button class="btn btn-sm btn-outline-primary" @click="activeTab='drives'">View all</button>
            </div>
            <div v-if="loadingDash" class="pp-spinner"><div class="spinner-border spinner-border-sm"></div></div>
            <div v-else-if="pendingDrives.length===0" class="empty-state">
              <i class="bi bi-briefcase"></i>No pending drives
            </div>
            <div v-else class="d-flex flex-column gap-2">
              <div v-for="d in pendingDrives.slice(0,4)" :key="d.id"
                class="d-flex align-items-center justify-content-between p-2 rounded"
                style="background:var(--surface-2)">
                <div>
                  <div style="font-weight:500;font-size:.9rem">{{ d.title }}</div>
                  <div class="text-muted" style="font-size:.78rem">{{ d.company_name }}</div>
                </div>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-success" @click="approveDrive(d)">
                    <i class="bi bi-check"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" @click="openRejectModal('drive', d)">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: Companies ──────────────────────────────────── -->
    <div v-if="activeTab==='companies'">
      <div class="pp-card mb-3">
        <div class="row g-2">
          <div class="col-md-5">
            <input v-model="companySearch" class="form-control" placeholder="Search companies..."
              @input="debouncedCompanySearch"/>
          </div>
          <div class="col-md-3">
            <select v-model="companyStatus" class="form-select" @change="fetchCompanies">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loadingCompanies" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="companies.length===0" class="empty-state pp-card">
        <i class="bi bi-building"></i>No companies found
      </div>
      <div v-else class="pp-card">
        <table class="pp-table">
          <thead>
            <tr>
              <th>Company</th><th>HR contact</th><th>Industry</th>
              <th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in companies" :key="c.id">
              <td>
                <div class="fw-500">{{ c.name }}</div>
                <div class="text-muted" style="font-size:.78rem">{{ c.website }}</div>
              </td>
              <td>{{ c.hr_name }}<br>
                <span class="text-muted" style="font-size:.78rem">{{ c.hr_email }}</span>
              </td>
              <td>{{ c.industry || '—' }}</td>
              <td>
                <span :class="'status-badge '+(c.is_blacklisted?'rejected':c.approval_status)">
                  {{ c.is_blacklisted ? 'blacklisted' : c.approval_status }}
                </span>
              </td>
              <td>
                <div class="d-flex gap-1 flex-wrap">
                  <button v-if="c.approval_status==='pending'" class="btn btn-sm btn-success"
                    @click="approveCompany(c)">Approve</button>
                  <button v-if="c.approval_status==='pending'" class="btn btn-sm btn-danger"
                    @click="openRejectModal('company', c)">Reject</button>
                  <button v-if="c.approval_status==='approved' && !c.is_blacklisted"
                    class="btn btn-sm btn-outline-danger"
                    @click="openBlacklistModal('company', c)">Blacklist</button>
                  <button v-if="c.is_blacklisted" class="btn btn-sm btn-outline-secondary"
                    @click="unblacklistCompany(c)">Reinstate</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: Students ───────────────────────────────────── -->
    <div v-if="activeTab==='students'">
      <div class="pp-card mb-3">
        <input v-model="studentSearch" class="form-control" style="max-width:340px"
          placeholder="Search by name, roll number, branch..."
          @input="debouncedStudentSearch"/>
      </div>

      <div v-if="loadingStudents" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="students.length===0" class="empty-state pp-card">
        <i class="bi bi-people"></i>No students found
      </div>
      <div v-else class="pp-card">
        <table class="pp-table">
          <thead>
            <tr>
              <th>Name</th><th>Roll no.</th><th>Branch</th>
              <th>Year</th><th>CGPA</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in students" :key="s.id">
              <td class="fw-500">{{ s.full_name }}</td>
              <td class="mono text-muted">{{ s.roll_number }}</td>
              <td>{{ s.branch }}</td>
              <td>{{ s.year }}</td>
              <td>{{ s.cgpa }}</td>
              <td>
                <span :class="'status-badge '+(s.is_blacklisted?'rejected':'approved')">
                  {{ s.is_blacklisted ? 'blacklisted' : 'active' }}
                </span>
              </td>
              <td>
                <button v-if="!s.is_blacklisted" class="btn btn-sm btn-outline-danger"
                  @click="openBlacklistModal('student', s)">Blacklist</button>
                <button v-else class="btn btn-sm btn-outline-secondary"
                  @click="unblacklistStudent(s)">Reinstate</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: Drives ─────────────────────────────────────── -->
    <div v-if="activeTab==='drives'">
      <div class="pp-card mb-3">
        <div class="row g-2">
          <div class="col-md-5">
            <input v-model="driveSearch" class="form-control" placeholder="Search drives..."
              @input="debouncedDriveSearch"/>
          </div>
          <div class="col-md-3">
            <select v-model="driveStatus" class="form-select" @change="fetchDrives">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loadingDrives" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="drives.length===0" class="empty-state pp-card">
        <i class="bi bi-briefcase"></i>No drives found
      </div>
      <div v-else class="pp-card">
        <table class="pp-table">
          <thead>
            <tr>
              <th>Drive</th><th>Company</th><th>Deadline</th>
              <th>Applicants</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in drives" :key="d.id">
              <td>
                <div class="fw-500">{{ d.title }}</div>
                <div class="text-muted" style="font-size:.78rem">{{ d.job_type }}</div>
              </td>
              <td>{{ d.company_name }}</td>
              <td style="font-size:.85rem">{{ formatDate(d.application_deadline) }}</td>
              <td>{{ d.applicant_count }}</td>
              <td><span :class="'status-badge '+d.status">{{ d.status }}</span></td>
              <td>
                <div class="d-flex gap-1 flex-wrap">
                  <button v-if="d.status==='pending'" class="btn btn-sm btn-success"
                    @click="approveDrive(d)">Approve</button>
                  <button v-if="d.status==='pending'" class="btn btn-sm btn-danger"
                    @click="openRejectModal('drive', d)">Reject</button>
                  <button v-if="d.status==='approved'" class="btn btn-sm btn-outline-secondary"
                    @click="closeDrive(d)">Close</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: Applications ───────────────────────────────── -->
    <div v-if="activeTab==='applications'">
      <div class="pp-card mb-3">
        <div class="row g-2">
          <div class="col-md-4">
            <select v-model="appStatus" class="form-select" @change="fetchApplications">
              <option value="">All statuses</option>
              <option v-for="s in ['applied','shortlisted','selected','rejected','waiting']"
                :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loadingApps" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="applications.length===0" class="empty-state pp-card">
        <i class="bi bi-file-earmark-text"></i>No applications found
      </div>
      <div v-else class="pp-card">
        <table class="pp-table">
          <thead>
            <tr>
              <th>Student</th><th>Drive</th><th>Company</th>
              <th>Applied</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in applications" :key="a.id">
              <td class="fw-500">{{ a.student_name }}</td>
              <td>{{ a.drive_title }}</td>
              <td>{{ a.company_name }}</td>
              <td style="font-size:.85rem">{{ formatDate(a.applied_at) }}</td>
              <td><span :class="'status-badge '+a.status">{{ a.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── TAB: Reports ────────────────────────────────────── -->
    <div v-if="activeTab==='reports'">
      <div v-if="loadingReport" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="report" class="row g-4">

        <div class="col-md-4">
          <div class="pp-card">
            <h6 class="fw-600 mb-3">Drives by status</h6>
            <div v-for="(val, key) in report.drives_by_status" :key="key"
              class="d-flex justify-content-between align-items-center py-2 border-bottom">
              <span :class="'status-badge '+key">{{ key }}</span>
              <span class="fw-500">{{ val }}</span>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="pp-card">
            <h6 class="fw-600 mb-3">Applications by status</h6>
            <div v-for="(val, key) in report.applications_by_status" :key="key"
              class="d-flex justify-content-between align-items-center py-2 border-bottom">
              <span :class="'status-badge '+key">{{ key }}</span>
              <span class="fw-500">{{ val }}</span>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="pp-card">
            <h6 class="fw-600 mb-3">Top hiring companies</h6>
            <div v-if="report.top_hiring_companies.length===0"
              class="text-muted" style="font-size:.875rem">No selections yet</div>
            <div v-for="(c, i) in report.top_hiring_companies" :key="i"
              class="d-flex justify-content-between align-items-center py-2 border-bottom">
              <span style="font-size:.9rem">{{ c.company }}</span>
              <span class="badge bg-success">{{ c.selected }} selected</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Reject modal ────────────────────────────────────── -->
    <div v-if="rejectModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem">
      <div class="pp-card" style="width:100%;max-width:440px">
        <h6 class="fw-600 mb-3">
          Reject {{ rejectModal.type === 'company' ? rejectModal.item.name : rejectModal.item.title }}
        </h6>
        <div class="mb-3">
          <label class="form-label">Reason <span class="text-danger">*</span></label>
          <textarea v-model="rejectModal.reason" class="form-control" rows="3"
            placeholder="Provide a reason for rejection..."></textarea>
        </div>
        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-outline-secondary" @click="rejectModal.show=false">Cancel</button>
          <button class="btn btn-danger" @click="confirmReject" :disabled="!rejectModal.reason.trim()">
            Reject
          </button>
        </div>
      </div>
    </div>

    <!-- ── Blacklist modal ─────────────────────────────────── -->
    <div v-if="blacklistModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem">
      <div class="pp-card" style="width:100%;max-width:440px">
        <h6 class="fw-600 mb-3">
          Blacklist {{ blacklistModal.type==='company' ? blacklistModal.item.name : blacklistModal.item.full_name }}
        </h6>
        <div class="pp-alert alert-danger mb-3">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          This will deactivate the account immediately.
          {{ blacklistModal.type==='company' ? 'All active drives will be closed.' : '' }}
        </div>
        <div class="mb-3">
          <label class="form-label">Reason <span class="text-danger">*</span></label>
          <textarea v-model="blacklistModal.reason" class="form-control" rows="3"
            placeholder="Provide a reason..."></textarea>
        </div>
        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-outline-secondary" @click="blacklistModal.show=false">Cancel</button>
          <button class="btn btn-danger" @click="confirmBlacklist"
            :disabled="!blacklistModal.reason.trim()">Blacklist</button>
        </div>
      </div>
    </div>

  </div>
  `,

  data() {
    return {
      activeTab: "overview",
      tabs: [
        { key: "overview",      label: "Overview",      icon: "bi bi-speedometer2" },
        { key: "companies",     label: "Companies",     icon: "bi bi-building" },
        { key: "students",      label: "Students",      icon: "bi bi-people" },
        { key: "drives",        label: "Drives",        icon: "bi bi-briefcase" },
        { key: "applications",  label: "Applications",  icon: "bi bi-file-earmark-text" },
        { key: "reports",       label: "Reports",       icon: "bi bi-bar-chart" },
      ],
      stats:            {},
      pendingCompanies: [],
      pendingDrives:    [],
      companies:        [],
      students:         [],
      drives:           [],
      applications:     [],
      report:           null,
      loadingDash:      true,
      loadingCompanies: false,
      loadingStudents:  false,
      loadingDrives:    false,
      loadingApps:      false,
      loadingReport:    false,
      companySearch:    "",
      companyStatus:    "pending",
      studentSearch:    "",
      driveSearch:      "",
      driveStatus:      "pending",
      appStatus:        "",
      globalSearch:     "",
      searchResults:    null,
      alert:    { msg: "", type: "success" },
      rejectModal:    { show: false, type: "", item: {}, reason: "" },
      blacklistModal: { show: false, type: "", item: {}, reason: "" },
      _timers: {},
    };
  },

  computed: {
    statCards() {
      const s = this.stats;
      return [
        { label: "Students",     value: s.total_students    || 0, icon: "bi bi-people-fill",      bg: "#eff6ff", color: "#1d4ed8" },
        { label: "Companies",    value: s.total_companies   || 0, icon: "bi bi-building-fill",     bg: "#f0fdf4", color: "#166534" },
        { label: "Drives",       value: s.total_drives      || 0, icon: "bi bi-briefcase-fill",    bg: "#fef3c7", color: "#92400e" },
        { label: "Applications", value: s.total_applications|| 0, icon: "bi bi-file-earmark-fill", bg: "#fdf2f8", color: "#86198f" },
        { label: "Pending co.",  value: s.pending_companies || 0, icon: "bi bi-hourglass-split",   bg: "#fff7ed", color: "#c2410c" },
        { label: "Pending drives",value:s.pending_drives    || 0, icon: "bi bi-clock-fill",        bg: "#fff7ed", color: "#c2410c" },
        { label: "Selected",     value: s.selected_students || 0, icon: "bi bi-trophy-fill",       bg: "#dcfce7", color: "#166534" },
        { label: "Avg CGPA",     value: "—",                      icon: "bi bi-graph-up",          bg: "#f3f4f6", color: "#374151" },
      ];
    }
  },

  watch: {
    activeTab(tab) {
      if (tab === "companies")    this.fetchCompanies();
      if (tab === "students")     this.fetchStudents();
      if (tab === "drives")       this.fetchDrives();
      if (tab === "applications") this.fetchApplications();
      if (tab === "reports")      this.fetchReport();
    }
  },

  async mounted() {
    await this.fetchDashboard();
  },

  methods: {
    async fetchDashboard() {
      this.loadingDash = true;
      try {
        const { data } = await ApiService.adminDashboard();
        this.stats = data.stats;
        const [co, dr] = await Promise.all([
          ApiService.adminCompanies({ status: "pending" }),
          ApiService.adminDrives({ status: "pending" }),
        ]);
        this.pendingCompanies = co.data.companies;
        this.pendingDrives    = dr.data.drives;
        this.tabs[1].badge = this.pendingCompanies.length || null;
        this.tabs[3].badge = this.pendingDrives.length    || null;
      } catch { this.showAlert("Failed to load dashboard", "danger"); }
      finally  { this.loadingDash = false; }
    },

    async fetchCompanies() {
      this.loadingCompanies = true;
      try {
        const params = {};
        if (this.companyStatus) params.status = this.companyStatus;
        if (this.companySearch) params.search = this.companySearch;
        const { data } = await ApiService.adminCompanies(params);
        this.companies = data.companies;
      } catch { this.showAlert("Failed to load companies", "danger"); }
      finally  { this.loadingCompanies = false; }
    },

    async fetchStudents() {
      this.loadingStudents = true;
      try {
        const params = this.studentSearch ? { search: this.studentSearch } : {};
        const { data } = await ApiService.adminStudents(params);
        this.students = data.students;
      } catch { this.showAlert("Failed to load students", "danger"); }
      finally  { this.loadingStudents = false; }
    },

    async fetchDrives() {
      this.loadingDrives = true;
      try {
        const params = {};
        if (this.driveStatus) params.status = this.driveStatus;
        if (this.driveSearch) params.search = this.driveSearch;
        const { data } = await ApiService.adminDrives(params);
        this.drives = data.drives;
      } catch { this.showAlert("Failed to load drives", "danger"); }
      finally  { this.loadingDrives = false; }
    },

    async fetchApplications() {
      this.loadingApps = true;
      try {
        const params = this.appStatus ? { status: this.appStatus } : {};
        const { data } = await ApiService.adminApplications(params);
        this.applications = data.applications;
      } catch { this.showAlert("Failed to load applications", "danger"); }
      finally  { this.loadingApps = false; }
    },

    async fetchReport() {
      this.loadingReport = true;
      try {
        const { data } = await ApiService.adminReport();
        this.report = data.report;
      } catch { this.showAlert("Failed to load report", "danger"); }
      finally  { this.loadingReport = false; }
    },

    // ── Company actions ──
    async approveCompany(c) {
      try {
        await ApiService.adminApproveCompany(c.id);
        c.approval_status = "approved";
        this.pendingCompanies = this.pendingCompanies.filter(x => x.id !== c.id);
        this.stats.pending_companies = Math.max(0, (this.stats.pending_companies||0) - 1);
        this.tabs[1].badge = this.pendingCompanies.length || null;
        this.showAlert(`${c.name} approved`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    async unblacklistCompany(c) {
      try {
        await ApiService.adminBlacklistCo(c.id, { reason: "reinstated" });
        c.is_blacklisted = false;
        this.showAlert(`${c.name} reinstated`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Student actions ──
    async unblacklistStudent(s) {
      try {
        await ApiService.adminUnblacklistStu(s.id);
        s.is_blacklisted = false;
        this.showAlert(`${s.full_name} reinstated`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Drive actions ──
    async approveDrive(d) {
      try {
        await ApiService.adminApproveDrive(d.id);
        d.status = "approved";
        this.pendingDrives = this.pendingDrives.filter(x => x.id !== d.id);
        this.stats.pending_drives = Math.max(0, (this.stats.pending_drives||0) - 1);
        this.tabs[3].badge = this.pendingDrives.length || null;
        this.showAlert(`"${d.title}" approved`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    async closeDrive(d) {
      if (!confirm(`Close drive "${d.title}"?`)) return;
      try {
        await ApiService.adminCloseDrive(d.id);
        d.status = "closed";
        this.showAlert(`"${d.title}" closed`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Modals ──
    openRejectModal(type, item) {
      this.rejectModal = { show: true, type, item, reason: "" };
    },

    async confirmReject() {
      const { type, item, reason } = this.rejectModal;
      try {
        if (type === "company") {
          await ApiService.adminRejectCompany(item.id, { reason });
          item.approval_status = "rejected";
          this.pendingCompanies = this.pendingCompanies.filter(x => x.id !== item.id);
          this.tabs[1].badge = this.pendingCompanies.length || null;
        } else {
          await ApiService.adminRejectDrive(item.id, { reason });
          item.status = "rejected";
          this.pendingDrives = this.pendingDrives.filter(x => x.id !== item.id);
          this.tabs[3].badge = this.pendingDrives.length || null;
        }
        this.rejectModal.show = false;
        this.showAlert("Rejected successfully", "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    openBlacklistModal(type, item) {
      this.blacklistModal = { show: true, type, item, reason: "" };
    },

    async confirmBlacklist() {
      const { type, item, reason } = this.blacklistModal;
      try {
        if (type === "company") {
          await ApiService.adminBlacklistCo(item.id, { reason });
          item.is_blacklisted = true;
        } else {
          await ApiService.adminBlacklistStu(item.id, { reason });
          item.is_blacklisted = true;
        }
        this.blacklistModal.show = false;
        this.showAlert("Blacklisted successfully", "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Global search ──
    debouncedGlobalSearch() {
      clearTimeout(this._timers.global);
      if (!this.globalSearch.trim()) { this.searchResults = null; return; }
      this._timers.global = setTimeout(async () => {
        try {
          const { data } = await ApiService.adminSearch(this.globalSearch);
          this.searchResults = data.results;
        } catch {}
      }, 400);
    },

    debouncedCompanySearch() {
      clearTimeout(this._timers.company);
      this._timers.company = setTimeout(() => this.fetchCompanies(), 400);
    },

    debouncedStudentSearch() {
      clearTimeout(this._timers.student);
      this._timers.student = setTimeout(() => this.fetchStudents(), 400);
    },

    debouncedDriveSearch() {
      clearTimeout(this._timers.drive);
      this._timers.drive = setTimeout(() => this.fetchDrives(), 400);
    },

    formatDate(dt) {
      if (!dt) return "—";
      return new Date(dt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    },

    showAlert(msg, type = "success") {
      this.alert = { msg, type };
      setTimeout(() => this.alert.msg = "", 4000);
    },
  }
};