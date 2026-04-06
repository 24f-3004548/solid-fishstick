const AdminDashboard = {
  props: {
    section: {
      type: String,
      default: "overview",
    },
  },
  template: `
  <div class="portal-page py-4 role-shell">

    <aside class="role-sidebar pp-card">
      <div class="role-sidebar-head">
        <div class="portal-subtitle">Admin</div>
        <h6>Navigation</h6>
      </div>
      <nav class="role-sidebar-nav">
        <button
          v-for="tab in tabs"
          :key="'admin_sb_' + tab.key"
          type="button"
          :class="['role-sidebar-link', { active: activeTab === tab.key }]"
          @click="goToTab(tab.key)">
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <div class="role-main">

    <div class="portal-hero flex-wrap">
      <div>
        <div class="portal-subtitle">Institutional Administration</div>
        <h2 class="mb-0">Moderation & System Control</h2>
        <p>Audit onboarding activity, monitor approvals, and manage platform-wide placement operations.</p>
      </div>
      <div class="portal-panel" style="width:300px;">
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input v-model="globalSearch" class="form-control" placeholder="Search students, companies..."
            @input="debouncedGlobalSearch"/>
        </div>
      </div>
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
              <div class="text-muted" style="font-size:.78rem">{{ s.email }} · {{ s.branch }}</div>
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

    <!-- ── TAB: Overview ───────────────────────────────────── -->
    <div v-if="activeTab==='overview'">
      <div class="row g-3 mb-4">
        <div class="col-lg-6">
          <div class="pp-card h-100" style="background:linear-gradient(135deg,#003f87 0%,#0056b3 100%);color:#fff;">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div style="font-size:.72rem;letter-spacing:.12em;font-weight:700;opacity:.8;" class="text-uppercase">Success Metric</div>
              <span class="badge" style="background:rgba(255,255,255,.2);color:#fff;">Live</span>
            </div>
            <div style="font-size:2.25rem;font-weight:800;line-height:1;">
              {{ stats.total_students ? (((stats.selected_students || 0) / stats.total_students) * 100).toFixed(1) : '0.0' }}%
            </div>
            <div style="opacity:.86;margin-top:.5rem;">Overall Placement Rate</div>
            <div class="d-flex justify-content-between mt-4" style="font-size:.8rem;opacity:.9;">
              <span>{{ stats.selected_students || 0 }} selected</span>
              <span>{{ stats.total_students || 0 }} students</span>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-6">
          <div class="pp-card h-100 d-flex flex-column justify-content-between">
            <div class="d-flex justify-content-between align-items-start">
              <span style="font-size:.72rem;letter-spacing:.09em;font-weight:700;" class="text-uppercase text-muted">Total Students</span>
              <span class="status-badge approved">Active</span>
            </div>
            <div style="font-size:2rem;font-weight:800;line-height:1;">{{ stats.total_students || 0 }}</div>
          </div>
        </div>
        <div class="col-lg-3 col-6">
          <div class="pp-card h-100 d-flex flex-column justify-content-between">
            <div class="d-flex justify-content-between align-items-start">
              <span style="font-size:.72rem;letter-spacing:.09em;font-weight:700;" class="text-uppercase text-muted">Placement Drives</span>
              <span class="status-badge pending">Ongoing</span>
            </div>
            <div style="font-size:2rem;font-weight:800;line-height:1;">{{ stats.total_drives || 0 }}</div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-xl-4">
          <div class="pp-card h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0 fw-bold">Approval Queue</h6>
              <span class="badge bg-danger">{{ (pendingCompanies.length || 0) + (pendingDrives.length || 0) }} pending</span>
            </div>

            <div v-if="loadingDash" class="pp-spinner"><div class="spinner-border spinner-border-sm"></div></div>

            <div v-else class="d-flex flex-column gap-2">
              <div v-for="c in pendingCompanies.slice(0,2)" :key="'pc_'+c.id" class="p-3 rounded-3" style="background:var(--surface-1);border-left:3px solid var(--brand);">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="fw-semibold">{{ c.name }}</div>
                    <div class="text-muted" style="font-size:.78rem;">Company registration</div>
                  </div>
                  <small class="text-muted">{{ formatDateOnly(c.created_at) }}</small>
                </div>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-sm btn-primary" @click="approveCompany(c)">Approve</button>
                  <button class="btn btn-sm btn-outline-danger" @click="openRejectModal('company', c)">Decline</button>
                </div>
              </div>

              <div v-for="d in pendingDrives.slice(0,2)" :key="'pd_'+d.id" class="p-3 rounded-3" style="background:var(--surface-1);border-left:3px solid #983c00;">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="fw-semibold">{{ d.title }}</div>
                    <div class="text-muted" style="font-size:.78rem;">{{ d.company_name }}</div>
                  </div>
                  <small class="text-muted">{{ formatDateOnly(d.created_at) }}</small>
                </div>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-sm btn-primary" @click="openDriveReview(d)">Review</button>
                </div>
              </div>

              <button class="btn btn-outline-secondary btn-sm mt-1" @click="goToTab('companies')">View all pending actions</button>
            </div>
          </div>
        </div>

        <div class="col-xl-8">
          <div class="pp-card h-100">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div>
                <h6 class="mb-0 fw-bold">Student & Company Roster</h6>
                <small class="text-muted">Recent entities and platform status snapshot</small>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" @click="goToTab('students')">Students</button>
                <button class="btn btn-sm btn-outline-primary" @click="goToTab('companies')">Companies</button>
              </div>
            </div>

            <table class="pp-table mb-0">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th class="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="fw-semibold">Applications</td>
                  <td>{{ stats.total_applications || 0 }}</td>
                  <td><span class="status-badge approved">Live</span></td>
                  <td class="text-end"><button class="btn btn-sm btn-outline-secondary" @click="goToTab('applications')">Open</button></td>
                </tr>
                <tr>
                  <td class="fw-semibold">Pending companies</td>
                  <td>{{ stats.pending_companies || 0 }}</td>
                  <td><span class="status-badge pending">Review</span></td>
                  <td class="text-end"><button class="btn btn-sm btn-outline-secondary" @click="goToTab('companies')">Open</button></td>
                </tr>
                <tr>
                  <td class="fw-semibold">Pending drives</td>
                  <td>{{ stats.pending_drives || 0 }}</td>
                  <td><span class="status-badge pending">Review</span></td>
                  <td class="text-end"><button class="btn btn-sm btn-outline-secondary" @click="goToTab('drives')">Open</button></td>
                </tr>
                <tr>
                  <td class="fw-semibold">System health</td>
                  <td>Runtime</td>
                  <td><span class="status-badge approved">Stable</span></td>
                  <td class="text-end"><button class="btn btn-sm btn-outline-secondary" @click="goToTab('health')">Inspect</button></td>
                </tr>
              </tbody>
            </table>
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
          placeholder="Search by name or branch..."
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
              <th>Name</th><th>Branch</th>
              <th>Year</th><th>CGPA</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in students" :key="s.id">
              <td class="fw-500">{{ s.full_name }}</td>
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
                  <button v-if="d.status==='pending'" class="btn btn-sm btn-primary"
                    @click="openDriveReview(d)">Review</button>
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
              <option v-for="s in ['applied','accepted','interview','interview_accepted','offered','joined','offer_withdrawn','void_joined_elsewhere','rejected']"
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
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h6 class="mb-0 fw-600">Placement activity report</h6>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" @click="fetchReport"
            :disabled="loadingReport || sendingReport">
            <i class="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
          <button class="btn btn-sm btn-primary" @click="sendInstantReport"
            :disabled="loadingReport || sendingReport">
            <i class="bi bi-envelope me-1"></i>
            <span v-if="sendingReport" class="spinner-border spinner-border-sm me-1"></span>
            {{ sendingReport ? 'Sending...' : 'Send Report' }}
          </button>
        </div>
      </div>
      <div v-if="reportMessage" :class="['pp-alert', reportMessage.type === 'danger' ? 'alert-danger' : 'alert-success', 'mb-3']">
        <i :class="reportMessage.type === 'danger' ? 'bi bi-exclamation-circle-fill' : 'bi bi-check-circle-fill'"></i>
        {{ reportMessage.text }}
      </div>
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

    <!-- ── TAB: System Health ─────────────────────────────── -->
    <div v-if="activeTab==='health'">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h6 class="mb-0 fw-600">Infrastructure status</h6>
        <button class="btn btn-sm btn-outline-primary" @click="fetchSystemHealth">
          <i class="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      <div v-if="loadingHealth" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="health" class="row g-3">
        <div class="col-md-4" v-for="(component, name) in health.components" :key="name">
          <div class="pp-card">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="fw-500" style="text-transform:capitalize">{{ name.replace('_', ' ') }}</span>
              <span :class="'status-badge '+healthBadgeClass(component.status)">{{ component.status }}</span>
            </div>
            <pre class="mb-0 text-muted" style="font-size:.75rem;white-space:pre-wrap">{{ JSON.stringify(component, null, 2) }}</pre>
          </div>
        </div>

        <div class="col-12">
          <div class="pp-card">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="fw-600">Overall status</div>
                <div class="text-muted" style="font-size:.85rem">Generated at: {{ formatDate(health.generated_at) }}</div>
              </div>
              <span :class="'status-badge '+healthBadgeClass(health.status)">{{ health.status }}</span>
            </div>
            <div class="mt-3" v-if="health.job_runs">
              <div class="fw-500 mb-2" style="font-size:.85rem">Latest scheduled jobs</div>
              <div class="d-flex flex-wrap gap-2">
                <span
                  v-for="(run, jobName) in health.job_runs"
                  :key="jobName"
                  :class="'status-badge '+healthBadgeClass(run?.status === 'success' ? 'up' : (run ? 'down' : 'waiting'))"
                >
                  {{ jobName.split('.').pop() }}: {{ run ? run.status : 'no-runs' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: Audit Logs ───────────────────────────────── -->
    <div v-if="activeTab==='audit'">
      <div class="pp-card mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label">Action contains</label>
            <input v-model="auditAction" class="form-control" placeholder="e.g. drive.approve" @input="debouncedAuditSearch" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Entity type</label>
            <select v-model="auditEntityType" class="form-select" @change="fetchAuditLogs">
              <option value="">All</option>
              <option value="company">company</option>
              <option value="student">student</option>
              <option value="drive">drive</option>
              <option value="application">application</option>
              <option value="user">user</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">Limit</label>
            <select v-model.number="auditLimit" class="form-select" @change="fetchAuditLogs">
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="200">200</option>
            </select>
          </div>
          <div class="col-md-3 text-md-end">
            <button class="btn btn-outline-primary" @click="fetchAuditLogs">
              <i class="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>
        </div>
      </div>

      <div v-if="loadingAudit" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="auditLogs.length===0" class="empty-state pp-card">
        <i class="bi bi-journal-text"></i>No audit logs found
      </div>
      <div v-else class="pp-card">
        <table class="pp-table">
          <thead>
            <tr>
              <th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in auditLogs" :key="row.id">
              <td style="font-size:.82rem">{{ formatDate(row.created_at) }}</td>
              <td style="font-size:.85rem">{{ row.actor_email || ('User #' + (row.actor_user_id || 'N/A')) }}</td>
              <td><span class="mono" style="font-size:.78rem">{{ row.action }}</span></td>
              <td style="font-size:.82rem">{{ row.entity_type }} #{{ row.entity_id || '—' }}</td>
              <td style="font-size:.82rem">{{ row.ip_address || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Drive review modal ─────────────────────────────── -->
    <div v-if="driveReviewModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem">
      <div class="pp-card" style="width:100%;max-width:680px;max-height:90vh;overflow:auto;">
        <div class="d-flex justify-content-between align-items-start mb-3 gap-3">
          <div>
            <h6 class="fw-600 mb-1">{{ driveReviewModal.item.title }}</h6>
            <div class="text-muted" style="font-size:.86rem;">{{ driveReviewModal.item.company_name }}</div>
          </div>
          <span :class="'status-badge '+driveReviewModal.item.status">{{ driveReviewModal.item.status }}</span>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Job Type</div>
            <div class="fw-500">{{ driveReviewModal.item.job_type || '—' }}</div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Location</div>
            <div class="fw-500">{{ driveReviewModal.item.location || '—' }}</div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Salary</div>
            <div class="fw-500">{{ driveReviewModal.item.salary_lpa ? ('₹' + driveReviewModal.item.salary_lpa + ' LPA') : '—' }}</div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Minimum CGPA</div>
            <div class="fw-500">{{ driveReviewModal.item.min_cgpa ?? '—' }}</div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Eligible Branches</div>
            <div class="fw-500">
              {{ Array.isArray(driveReviewModal.item.eligible_branches) && driveReviewModal.item.eligible_branches.length
                ? driveReviewModal.item.eligible_branches.join(', ')
                : 'All branches' }}
            </div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Eligible Years</div>
            <div class="fw-500">
              {{ Array.isArray(driveReviewModal.item.eligible_years) && driveReviewModal.item.eligible_years.length
                ? driveReviewModal.item.eligible_years.join(', ')
                : 'All years' }}
            </div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Apply Deadline</div>
            <div class="fw-500">{{ formatDate(driveReviewModal.item.application_deadline) }}</div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Drive Date</div>
            <div class="fw-500">{{ driveReviewModal.item.drive_date ? formatDate(driveReviewModal.item.drive_date) : '—' }}</div>
          </div>
          <div class="col-12">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Description</div>
            <div class="portal-panel mt-1" style="white-space:pre-wrap;font-size:.88rem;">{{ driveReviewModal.item.description || '—' }}</div>
          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end mt-4">
          <button class="btn btn-outline-secondary" @click="closeDriveReview">Close</button>
          <button
            v-if="driveReviewModal.item.status==='pending'"
            class="btn btn-danger"
            @click="openRejectFromDriveReview">
            Reject
          </button>
          <button
            v-if="driveReviewModal.item.status==='pending'"
            class="btn btn-success"
            @click="approveDrive(driveReviewModal.item)">
            Approve
          </button>
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
        <p class="form-legend">Fields marked with * are required.</p>
        <div class="mb-3">
          <label class="form-label label-required">Reason</label>
          <textarea
            v-model="rejectModal.reason"
            :class="['form-control', { 'is-invalid': rejectValidation.submitted && rejectModal.reason.trim().length < 5 }]"
            rows="3"
            maxlength="300"
            placeholder="Provide a reason for rejection..."></textarea>
          <div class="d-flex justify-content-between align-items-center mt-1">
            <div class="field-hint">Minimum 5 characters.</div>
            <small :class="['field-hint', rejectModal.reason.length > 280 ? 'text-danger' : '']">
              {{ rejectModal.reason.length }}/300
            </small>
          </div>
        </div>
        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-outline-secondary" @click="cancelReject">Cancel</button>
          <button class="btn btn-danger" @click="confirmReject" :disabled="rejectModal.reason.trim().length < 5">
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
        <p class="form-legend">Fields marked with * are required.</p>
        <div class="mb-3">
          <label class="form-label label-required">Reason</label>
          <textarea
            v-model="blacklistModal.reason"
            :class="['form-control', { 'is-invalid': blacklistValidation.submitted && !blacklistModal.reason.trim() }]"
            rows="3"
            maxlength="300"
            placeholder="Provide a reason..."></textarea>
          <div class="d-flex justify-content-between align-items-center mt-1">
            <div class="field-hint">This reason will be recorded in audit logs.</div>
            <small :class="['field-hint', blacklistModal.reason.length > 280 ? 'text-danger' : '']">
              {{ blacklistModal.reason.length }}/300
            </small>
          </div>
        </div>
        <div class="d-flex gap-2 justify-content-end">
          <button class="btn btn-outline-secondary" @click="cancelBlacklist">Cancel</button>
          <button class="btn btn-danger" @click="confirmBlacklist"
            :disabled="!blacklistModal.reason.trim()">Blacklist</button>
        </div>
      </div>
    </div>

    </div>
  </div>
  `,

  data() {
    return {
      activeTab: this.section || "overview",
      tabs: [
        { key: "overview",      label: "Overview",      icon: "bi bi-speedometer2" },
        { key: "companies",     label: "Companies",     icon: "bi bi-building" },
        { key: "students",      label: "Students",      icon: "bi bi-people" },
        { key: "drives",        label: "Drives",        icon: "bi bi-briefcase" },
        { key: "applications",  label: "Applications",  icon: "bi bi-file-earmark-text" },
        { key: "reports",       label: "Reports",       icon: "bi bi-bar-chart" },
        { key: "health",        label: "System Health", icon: "bi bi-heart-pulse" },
        { key: "audit",         label: "Audit Logs",    icon: "bi bi-journal-text" },
      ],
      stats:            {},
      pendingCompanies: [],
      pendingDrives:    [],
      companies:        [],
      students:         [],
      drives:           [],
      applications:     [],
      report:           null,
      health:           null,
      auditLogs:        [],
      loadingDash:      true,
      loadingCompanies: false,
      loadingStudents:  false,
      loadingDrives:    false,
      loadingApps:      false,
      loadingReport:    false,
      loadingHealth:    false,
      loadingAudit:     false,
      sendingReport:    false,
      reportMessage:    null,
      companySearch:    "",
      companyStatus:    "pending",
      studentSearch:    "",
      driveSearch:      "",
      driveStatus:      "pending",
      appStatus:        "",
      auditAction:      "",
      auditEntityType:  "",
      auditLimit:       100,
      globalSearch:     "",
      searchResults:    null,
      alert:    { msg: "", type: "success" },
      rejectModal:    { show: false, type: "", item: {}, reason: "" },
      driveReviewModal: { show: false, item: {} },
      blacklistModal: { show: false, type: "", item: {}, reason: "" },
      rejectValidation: { submitted: false },
      blacklistValidation: { submitted: false },
      _timers: {},
      _onWindowFocus: null,
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
        { label: "Pending companies",  value: s.pending_companies || 0, icon: "bi bi-hourglass-split",   bg: "#fff7ed", color: "#c2410c" },
        { label: "Pending drives",value:s.pending_drives    || 0, icon: "bi bi-clock-fill",        bg: "#fff7ed", color: "#c2410c" },
        { label: "Selected",     value: s.selected_students || 0, icon: "bi bi-trophy-fill",       bg: "#dcfce7", color: "#166534" },
        { label: "Avg CGPA",     value: "—",                      icon: "bi bi-graph-up",          bg: "#f3f4f6", color: "#374151" },
      ];
    }
  },

  watch: {
    section(next) {
      this.activeTab = next || "overview";
    },
    activeTab(tab) {
      if (tab === "companies")    this.fetchCompanies();
      if (tab === "students")     this.fetchStudents();
      if (tab === "drives")       this.fetchDrives();
      if (tab === "applications") this.fetchApplications();
      if (tab === "reports")      this.fetchReport();
      if (tab === "health")       this.fetchSystemHealth();
      if (tab === "audit")        this.fetchAuditLogs();
    }
  },

  async mounted() {
    await this.fetchDashboard();
    this._onWindowFocus = () => this.refreshCurrentView(true);
    window.addEventListener("focus", this._onWindowFocus);
  },

  beforeUnmount() {
    Object.values(this._timers).forEach((timer) => clearTimeout(timer));
    if (this._onWindowFocus) window.removeEventListener("focus", this._onWindowFocus);
  },

  methods: {
    routeForTab(tab) {
      const map = {
        overview: "/admin/dashboard",
        companies: "/admin/companies",
        students: "/admin/students",
        drives: "/admin/drives",
        applications: "/admin/applications",
        reports: "/admin/reports",
        health: "/admin/system-health",
        audit: "/admin/audit-logs",
      };
      return map[tab] || "/admin/dashboard";
    },

    goToTab(tab) {
      const target = this.routeForTab(tab);
      if (this.$route.path !== target) this.$router.push(target);
    },

    async refreshCurrentView(silent = false) {
      await this.fetchDashboard(silent);
      if (this.activeTab === "companies") await this.fetchCompanies(silent);
      if (this.activeTab === "students") await this.fetchStudents(silent);
      if (this.activeTab === "drives") await this.fetchDrives(silent);
      if (this.activeTab === "applications") await this.fetchApplications(silent);
      if (this.activeTab === "reports") await this.fetchReport(silent);
      if (this.activeTab === "health") await this.fetchSystemHealth(silent);
      if (this.activeTab === "audit") await this.fetchAuditLogs(silent);
    },

    async fetchDashboard(silent = false) {
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
      } catch {
        if (!silent) this.showAlert("Failed to load dashboard", "danger");
      }
      finally  { this.loadingDash = false; }
    },

    async fetchCompanies(silent = false) {
      this.loadingCompanies = true;
      try {
        const params = {};
        if (this.companyStatus) params.status = this.companyStatus;
        if (this.companySearch) params.search = this.companySearch;
        const { data } = await ApiService.adminCompanies(params);
        this.companies = data.companies;
      } catch {
        if (!silent) this.showAlert("Failed to load companies", "danger");
      }
      finally  { this.loadingCompanies = false; }
    },

    async fetchStudents(silent = false) {
      this.loadingStudents = true;
      try {
        const params = this.studentSearch ? { search: this.studentSearch } : {};
        const { data } = await ApiService.adminStudents(params);
        this.students = data.students;
      } catch {
        if (!silent) this.showAlert("Failed to load students", "danger");
      }
      finally  { this.loadingStudents = false; }
    },

    async fetchDrives(silent = false) {
      this.loadingDrives = true;
      try {
        const params = {};
        if (this.driveStatus) params.status = this.driveStatus;
        if (this.driveSearch) params.search = this.driveSearch;
        const { data } = await ApiService.adminDrives(params);
        this.drives = data.drives;
      } catch {
        if (!silent) this.showAlert("Failed to load drives", "danger");
      }
      finally  { this.loadingDrives = false; }
    },

    async fetchApplications(silent = false) {
      this.loadingApps = true;
      try {
        const params = this.appStatus ? { status: this.appStatus } : {};
        const { data } = await ApiService.adminApplications(params);
        this.applications = data.applications;
      } catch {
        if (!silent) this.showAlert("Failed to load applications", "danger");
      }
      finally  { this.loadingApps = false; }
    },

    async fetchReport(silent = false) {
      this.loadingReport = true;
      try {
        const { data } = await ApiService.adminReport();
        this.report = data.report;
      } catch {
        if (!silent) this.showAlert("Failed to load report", "danger");
      }
      finally  { this.loadingReport = false; }
    },

    async sendInstantReport() {
      this.sendingReport = true;
      this.reportMessage = null;
      try {
        const { data } = await ApiService.adminSendInstantReport();
        this.reportMessage = {
          type: "success",
          text: data.message || "Report sent successfully to admin email!"
        };
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          this.reportMessage = null;
        }, 5000);
      } catch (err) {
        const msg = err.response?.data?.message ||  err.message || "Failed to send report";
        this.reportMessage = {
          type: "danger",
          text: msg
        };
      }
      finally { this.sendingReport = false; }
    },

    async fetchSystemHealth(silent = false) {
      this.loadingHealth = true;
      try {
        const { data } = await ApiService.adminSystemHealth();
        this.health = data.health;
      } catch {
        if (!silent) this.showAlert("Failed to load system health", "danger");
      } finally {
        this.loadingHealth = false;
      }
    },

    async fetchAuditLogs(silent = false) {
      this.loadingAudit = true;
      try {
        const params = {
          limit: this.auditLimit,
        };
        if (this.auditAction.trim()) params.action = this.auditAction.trim();
        if (this.auditEntityType) params.entity_type = this.auditEntityType;

        const { data } = await ApiService.adminAuditLogs(params);
        this.auditLogs = data.logs || [];
      } catch {
        if (!silent) this.showAlert("Failed to load audit logs", "danger");
      } finally {
        this.loadingAudit = false;
      }
    },

    // ── Company actions ──
    async approveCompany(c) {
      try {
        await ApiService.adminApproveCompany(c.id);
        c.approval_status = "approved";
        this.pendingCompanies = this.pendingCompanies.filter(x => x.id !== c.id);
        this.stats.pending_companies = Math.max(0, (this.stats.pending_companies||0) - 1);
        this.tabs[1].badge = this.pendingCompanies.length || null;
        await this.refreshCurrentView(true);
        this.showAlert(`${c.name} approved`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    async unblacklistCompany(c) {
      try {
        await ApiService.adminUnblacklistCo(c.id);
        c.is_blacklisted = false;
        await this.refreshCurrentView(true);
        this.showAlert(`${c.name} reinstated`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Student actions ──
    async unblacklistStudent(s) {
      try {
        await ApiService.adminUnblacklistStu(s.id);
        s.is_blacklisted = false;
        await this.refreshCurrentView(true);
        this.showAlert(`${s.full_name} reinstated`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Drive actions ──
    openDriveReview(drive) {
      this.driveReviewModal = { show: true, item: drive };
    },

    closeDriveReview() {
      this.driveReviewModal = { show: false, item: {} };
    },

    openRejectFromDriveReview() {
      this.openRejectModal("drive", this.driveReviewModal.item);
      this.closeDriveReview();
    },

    async approveDrive(d) {
      try {
        await ApiService.adminApproveDrive(d.id);
        d.status = "approved";
        this.pendingDrives = this.pendingDrives.filter(x => x.id !== d.id);
        this.stats.pending_drives = Math.max(0, (this.stats.pending_drives||0) - 1);
        this.tabs[3].badge = this.pendingDrives.length || null;
        if (this.driveReviewModal.show && this.driveReviewModal.item?.id === d.id) {
          this.closeDriveReview();
        }
        await this.refreshCurrentView(true);
        this.showAlert(`"${d.title}" approved`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    async closeDrive(d) {
      if (!confirm(`Close drive "${d.title}"?`)) return;
      try {
        await ApiService.adminCloseDrive(d.id);
        d.status = "closed";
        await this.refreshCurrentView(true);
        this.showAlert(`"${d.title}" closed`, "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    // ── Modals ──
    openRejectModal(type, item) {
      this.rejectValidation.submitted = false;
      this.rejectModal = { show: true, type, item, reason: "" };
    },

    cancelReject() {
      this.rejectValidation.submitted = false;
      this.rejectModal.show = false;
    },

    async confirmReject() {
      this.rejectValidation.submitted = true;
      if (this.rejectModal.reason.trim().length < 5) {
        this.showAlert("Rejection reason must be at least 5 characters", "danger");
        return;
      }
      const { type, item, reason } = this.rejectModal;
      try {
        if (type === "company") {
          await ApiService.adminRejectCompany(item.id, { reason });
          item.approval_status = "rejected";
          this.pendingCompanies = this.pendingCompanies.filter(x => x.id !== item.id);
          this.stats.pending_companies = Math.max(0, (this.stats.pending_companies || 0) - 1);
          this.tabs[1].badge = this.pendingCompanies.length || null;
        } else {
          await ApiService.adminRejectDrive(item.id, { reason });
          item.status = "rejected";
          this.pendingDrives = this.pendingDrives.filter(x => x.id !== item.id);
          this.stats.pending_drives = Math.max(0, (this.stats.pending_drives || 0) - 1);
          this.stats.total_drives = Math.max(0, (this.stats.total_drives || 0) - 1);
          this.tabs[3].badge = this.pendingDrives.length || null;
        }
        this.rejectModal.show = false;
        this.rejectValidation.submitted = false;
        await this.refreshCurrentView(true);
        this.showAlert("Rejected successfully", "success");
      } catch (e) { this.showAlert(e.response?.data?.message || "Failed", "danger"); }
    },

    openBlacklistModal(type, item) {
      this.blacklistValidation.submitted = false;
      this.blacklistModal = { show: true, type, item, reason: "" };
    },

    cancelBlacklist() {
      this.blacklistValidation.submitted = false;
      this.blacklistModal.show = false;
    },

    async confirmBlacklist() {
      this.blacklistValidation.submitted = true;
      if (!this.blacklistModal.reason.trim()) {
        this.showAlert("Blacklist reason is required", "danger");
        return;
      }
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
        this.blacklistValidation.submitted = false;
        await this.refreshCurrentView(true);
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

    debouncedAuditSearch() {
      clearTimeout(this._timers.audit);
      this._timers.audit = setTimeout(() => this.fetchAuditLogs(), 400);
    },

    formatDate(dt) {
      if (!dt) return "—";
      return new Date(dt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) + " IST";
    },

    formatDateOnly(dt) {
      if (!dt) return "";
      return new Date(dt).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },

    healthBadgeClass(status) {
      if (status === "up") return "approved";
      if (status === "degraded") return "pending";
      if (status === "down") return "rejected";
      return "waiting";
    },

    showAlert(msg, type = "success") {
      if (typeof window.ppToast === "function") {
        window.ppToast(msg, type);
      }
    },
  }
};