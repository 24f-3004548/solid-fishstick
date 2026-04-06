const CompanyDashboard = {
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
        <div class="portal-subtitle">Company</div>
        <h6>Navigation</h6>
      </div>
      <nav class="role-sidebar-nav">
        <button
          v-for="tab in tabs"
          :key="'company_sb_' + tab.key"
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
        <div class="portal-subtitle">Company Workspace</div>
        <h2 class="mb-0">Welcome back, {{ company.name || 'Company' }}</h2>
        <p>Manage your active recruitment campaigns and track applicant progress across campuses.</p>
      </div>
      <div class="portal-panel d-flex align-items-center gap-3" style="padding:.8rem 1rem;min-width:190px;">
        <div class="stat-icon" style="background:var(--surface-2)"><i class="bi bi-megaphone-fill" style="color:var(--brand)"></i></div>
        <div>
          <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Active drives</div>
          <div style="font-size:1.25rem;font-weight:800;line-height:1;">{{ stats.approved_drives || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- ── TAB: Overview ───────────────────────────────────── -->
    <div v-if="activeTab==='overview'">
      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <div class="pp-card h-100 position-relative overflow-hidden">
            <div class="d-flex justify-content-between align-items-start mb-4">
              <div class="company-logo" style="width:56px;height:56px;"><i class="bi bi-building"></i></div>
              <span :class="'status-badge ' + (company.is_blacklisted ? 'rejected' : (company.approval_status || 'pending'))">
                {{ company.is_blacklisted ? 'Blacklisted' : formatStatusLabel(company.approval_status || 'pending') }}
              </span>
            </div>
            <h5 class="fw-bold mb-2">{{ company.name || 'Company Profile' }}</h5>
            <p class="text-muted mb-3" style="max-width:520px;">{{ company.description || 'Company description will appear here for student visibility.' }}</p>
            <div class="d-flex gap-4 flex-wrap">
              <div>
                <div class="text-muted text-uppercase" style="font-size:.66rem;letter-spacing:.08em;font-weight:700;">Industry</div>
                <div class="fw-semibold">{{ company.industry || 'Information Technology' }}</div>
              </div>
              <div>
                <div class="text-muted text-uppercase" style="font-size:.66rem;letter-spacing:.08em;font-weight:700;">Global Reach</div>
                <div class="fw-semibold">{{ company.location || 'Multiple campuses' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="pp-card h-100" style="background:linear-gradient(135deg,#003f87 0%,#0056b3 100%);color:#fff;">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0 fw-bold">Applicant Velocity</h6>
              <i class="bi bi-graph-up-arrow"></i>
            </div>
            <div style="font-size:2.2rem;font-weight:800;line-height:1;">{{ stats.total_applicants || 0 }}</div>
            <div style="opacity:.82;">Total applicants this season</div>
            <div class="d-flex align-items-end gap-2 mt-4" style="height:76px;">
              <div v-for="(bar,i) in applicantVelocityBars" :key="'bar_'+i" :style="{height:bar.height+'%',background:bar.highlight?'#ffffff':'rgba(255,255,255,.35)',flex:'1',borderRadius:'4px 4px 0 0'}"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="company-overview-grid mb-4">
        <div class="pp-card h-100">
          <h6 class="fw-bold mb-3">Current Placement</h6>
          <div class="row g-3">
            <div class="col-6">
              <div class="portal-panel h-100 company-kpi-panel">
                <div class="text-muted text-uppercase" style="font-size:.66rem;letter-spacing:.08em;font-weight:700;">Joined</div>
                <div class="fw-bold company-kpi-value">{{ stats.total_selected || 0 }}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="portal-panel h-100 company-kpi-panel">
                <div class="text-muted text-uppercase" style="font-size:.66rem;letter-spacing:.08em;font-weight:700;">Offered</div>
                <div class="fw-bold company-kpi-value">{{ stats.total_offered || 0 }}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="portal-panel h-100 company-kpi-panel">
                <div class="text-muted text-uppercase" style="font-size:.66rem;letter-spacing:.08em;font-weight:700;">Applicants</div>
                <div class="fw-bold company-kpi-value">{{ stats.total_applicants || 0 }}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="portal-panel h-100 company-kpi-panel">
                <div class="text-muted text-uppercase" style="font-size:.66rem;letter-spacing:.08em;font-weight:700;">Active Drives</div>
                <div class="fw-bold company-kpi-value">{{ stats.approved_drives || 0 }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="pp-card h-100">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 class="fw-bold mb-0">Applicant Diversity Index</h6>
              <small class="text-muted">Based on current active recruitment drives</small>
            </div>
          </div>

          <div class="company-diversity-layout">
            <div class="company-diversity-chart-wrap">
              <svg viewBox="0 0 200 200" class="company-diversity-pie" role="img" aria-label="Applicant diversity pie chart">
                <circle cx="100" cy="100" r="92" fill="#dfe3e6"></circle>
                <path
                  v-for="slice in diversityPieSlices"
                  :key="'slice_'+slice.label"
                  :d="slice.path"
                  :fill="slice.color"
                  :style="{ opacity: hoveredDiversity && hoveredDiversity.label !== slice.label ? 0.45 : 1 }"
                  @mouseenter="hoveredDiversity = slice"
                  @mouseleave="hoveredDiversity = null"
                ></path>
              </svg>
              <div class="company-diversity-hover-tag" v-if="hoveredDiversity">
                <strong>{{ hoveredDiversity.label }}</strong>
                <span>{{ hoveredDiversity.percent }}%</span>
              </div>
            </div>
            <div :class="['company-diversity-legend', { 'two-col': diversitySegments.length >= 6 }]">
              <div v-if="!diversitySegments.length" class="text-muted" style="font-size:.88rem;">No applicant diversity data available yet.</div>
              <div
                v-for="segment in diversitySegments"
                :key="segment.label"
                class="company-diversity-item"
                :class="{ active: hoveredDiversity && hoveredDiversity.label === segment.label }"
                @mouseenter="hoveredDiversity = segment"
                @mouseleave="hoveredDiversity = null"
              >
                <span class="badge me-2" :style="{ background: segment.color }">&nbsp;</span>
                {{ segment.label }} ({{ segment.percent }}%)
              </div>
            </div>
          </div>
        </div>

        <div class="pp-card h-100">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h6 class="mb-0 fw-bold" style="border-left:3px solid var(--brand);padding-left:.5rem;">Drive</h6>
            <button class="btn btn-sm btn-link text-decoration-none" @click="goToTab('drives')">View all archives →</button>
          </div>
          <div class="d-flex flex-column gap-2 company-drive-compact-list">
            <div v-for="d in recentDrives.slice(0,4)" :key="'compact_recent_'+d.id" class="d-flex align-items-center justify-content-between p-2 rounded" style="background:var(--surface-1)">
              <div class="pe-2">
                <div class="fw-semibold" style="font-size:.88rem;">{{ d.title }}</div>
                <div class="text-muted" style="font-size:.79rem;">Deadline · {{ formatDate(d.application_deadline) }}</div>
              </div>
              <span :class="'status-badge '+d.status">{{ d.status }}</span>
            </div>
            <div v-if="!recentDrives.length" class="empty-state" style="padding:1rem .5rem;">
              <i class="bi bi-briefcase"></i>No active drives yet.
            </div>
          </div>
        </div>

        <div class="pp-card h-100">
          <h6 class="fw-bold mb-3">Recruitment Snapshot</h6>
          <div class="d-flex flex-column gap-2" style="font-size:.84rem;">
            <div class="d-flex justify-content-between"><span>Approved drives</span><strong>{{ stats.approved_drives || 0 }}</strong></div>
            <div class="d-flex justify-content-between"><span>Total applicants</span><strong>{{ stats.total_applicants || 0 }}</strong></div>
            <div class="d-flex justify-content-between"><span>Offers sent</span><strong>{{ stats.total_offered || 0 }}</strong></div>
            <div class="d-flex justify-content-between"><span>Students joined</span><strong>{{ stats.total_selected || 0 }}</strong></div>
          </div>
        </div>
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
        <div v-for="d in sortedDrives" :key="d.id" class="pp-card">
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

    <!-- ── TAB: Applications ───────────────────────────────── -->
    <div v-if="activeTab==='applications'">
      <div class="d-flex align-items-center gap-2 mb-3">
        <h6 class="mb-0 fw-600">Applications</h6>
      </div>

      <div class="pp-card mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label">Filter by drive</label>
            <select v-model="appDriveFilter" class="form-select" @change="fetchApplications">
              <option value="">All drives</option>
              <option v-for="d in appDriveOptions" :key="'drive_filter_' + d.id" :value="String(d.id)">
                {{ d.title }}
              </option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Filter by status</label>
            <select v-model="appStatusFilter" class="form-select" @change="fetchApplications">
              <option value="">All statuses</option>
              <option v-for="s in appStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="col-md-5">
            <label class="form-label">Search by student name</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input v-model="appSearch" class="form-control" placeholder="Student name..." @input="debouncedApplicationSearch" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingApps" class="pp-spinner"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="groupedApplications.length===0" class="empty-state pp-card">
        <i class="bi bi-inbox"></i>No applications found
      </div>
      <div v-else class="d-flex flex-column gap-4">
        <div v-for="group in groupedApplications" :key="'status_group_' + group.status">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h6 class="mb-0 fw-600">{{ formatStatusLabel(group.status) }}</h6>
            <span class="badge bg-light text-dark border">{{ group.items.length }}</span>
          </div>
          <div class="d-flex flex-column gap-3">
            <div v-for="a in group.items" :key="a.id" class="pp-card">
              <div class="d-flex align-items-start gap-3 flex-wrap">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="fw-500">{{ a.student_name }}</span>
                    <span :class="'status-badge '+a.status">{{ formatStatusLabel(a.status) }}</span>
                  </div>
                  <div class="text-muted" style="font-size:.82rem">{{ a.drive_title }}</div>
                  <div class="text-muted mt-1" style="font-size:.83rem">
                    Applied {{ formatDate(a.applied_at) }}
                  </div>
                  <div v-if="a.remarks" class="mt-1 text-muted" style="font-size:.82rem">
                    <i class="bi bi-chat-left-text me-1"></i>{{ a.remarks }}
                  </div>
                </div>

                <div class="d-flex gap-2 align-items-center flex-shrink-0 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" @click="openApplicationReview(a)">
                    <i class="bi bi-eye me-1"></i>Review
                  </button>
                </div>
              </div>
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
            <div class="stat-label">Total students joined</div>
          </div>
        </div>
        <div v-if="history.length===0" class="empty-state pp-card">
          <i class="bi bi-people"></i>No students joined yet
        </div>
        <div v-else class="pp-card">
          <table class="pp-table">
            <thead>
              <tr><th>Student</th><th>Drive</th><th>Joined on</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in history" :key="a.id">
                <td class="fw-500">{{ a.student_name }}</td>
                <td>{{ a.drive_title }}</td>
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

    <!-- ── Application Review Modal ────────────────────────── -->
    <div v-if="applicationReviewModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem">
      <div class="pp-card" style="width:100%;max-width:620px">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h6 class="fw-600 mb-1">Application Review</h6>
            <div class="text-muted" style="font-size:.85rem;">
              {{ applicationReviewModal.application?.drive_title || selectedDrive?.title }}
            </div>
          </div>
          <span :class="'status-badge '+(applicationReviewModal.application?.status || 'applied')">
            {{ applicationReviewModal.application?.status || 'applied' }}
          </span>
        </div>

        <div v-if="applicationReviewModal.loading" class="pp-spinner"><div class="spinner-border spinner-border-sm"></div></div>
        <div v-else>
          <div class="row g-3">
            <div class="col-md-6">
              <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Student</div>
              <div class="fw-500">{{ applicationReviewModal.student?.full_name || applicationReviewModal.application?.student_name || '—' }}</div>
            </div>
            <div class="col-md-6">
              <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Email</div>
              <div class="fw-500">{{ applicationReviewModal.student?.email || '—' }}</div>
            </div>
            <div class="col-md-4">
              <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Phone</div>
              <div class="fw-500">{{ applicationReviewModal.student?.phone || '—' }}</div>
            </div>
            <div class="col-md-4">
              <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Branch</div>
              <div class="fw-500">{{ applicationReviewModal.student?.branch || '—' }}</div>
            </div>
            <div class="col-md-2">
              <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Year</div>
              <div class="fw-500">{{ applicationReviewModal.student?.year || '—' }}</div>
            </div>
            <div class="col-md-2">
              <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">CGPA</div>
              <div class="fw-500">{{ applicationReviewModal.student?.cgpa ?? '—' }}</div>
            </div>
            <div class="col-12" v-if="applicationReviewModal.student?.resume_path">
              <a class="btn btn-sm btn-outline-secondary" :href="'/uploads/' + applicationReviewModal.student.resume_path" target="_blank" rel="noopener noreferrer">
                <i class="bi bi-file-earmark-pdf me-1"></i>View resume
              </a>
            </div>
          </div>

          <div v-if="applicationReviewModal.application?.status === 'interview'" class="pp-alert alert-info mt-3 mb-0">
            Waiting for student response to interview call.
          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end mt-4 flex-wrap">
          <button class="btn btn-outline-secondary" @click="closeApplicationReview">Close</button>
          <button
            v-if="applicationReviewModal.application?.status === 'applied'"
            class="btn btn-outline-primary"
            @click="markApplicationInterview">
            <i class="bi bi-telephone me-1"></i>Call for interview
          </button>
          <button
            v-if="['applied','interview','interview_accepted'].includes(applicationReviewModal.application?.status)"
            class="btn btn-outline-danger"
            @click="markApplicationRejected">
            <i class="bi bi-x-circle me-1"></i>Reject
          </button>
          <button
            v-if="applicationReviewModal.application?.status === 'interview_accepted'"
            class="btn btn-success"
            @click="markApplicationOffered">
            <i class="bi bi-check2-circle me-1"></i>Offer
          </button>
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
        { key: "overview",  label: "Overview",     icon: "bi bi-speedometer2" },
        { key: "drives",    label: "Drives",        icon: "bi bi-briefcase" },
        { key: "applications", label: "Applicants", icon: "bi bi-people" },
        { key: "history",   label: "Joined",        icon: "bi bi-trophy" },
        { key: "profile",   label: "Profile",       icon: "bi bi-building-gear" },
      ],
      company:       {},
      stats:         {},
      diversityBreakdown: [],
      recentDrives:  [],
      drives:        [],
      appDriveOptions: [],
      applications:  [],
      history:       [],
      selectedDrive: null,
      loadingDash:   true,
      loadingDrives: false,
      loadingApps:   false,
      loadingHistory:false,
      savingProfile: false,
      savingDrive:   false,
      _onWindowFocus: null,
      _appSearchTimer: null,
      driveValidation: { submitted: false },
      driveStatusFilter: "",
      appDriveFilter: "",
      appStatusFilter:   "",
      appStatuses: ["applied","interview","interview_accepted","offered","joined","void_joined_elsewhere","rejected"],
      appSearch: "",
      profileForm: { description:"", website:"", industry:"", location:"", hr_name:"", hr_email:"", hr_phone:"" },
      driveForm:   { title:"", description:"", job_type:"", location:"", salary_lpa:"", min_cgpa:0,
                     eligible_branches:"", eligible_years:"", application_deadline:"", drive_date:"" },
      driveModal:    { show: false, editing: false, driveId: null },
      applicationReviewModal: { show: false, loading: false, application: null, student: null },
      hoveredDiversity: null,
      alert: { msg: "", type: "success" },
    };
  },

  watch: {
    section(next) {
      this.activeTab = next || "overview";
    },
    activeTab(tab) {
      if (tab === "drives")  this.fetchDrives();
      if (tab === "applications") this.fetchApplications();
      if (tab === "history") this.fetchHistory();
    }
  },

  computed: {
    groupedApplications() {
      if (!Array.isArray(this.applications) || this.applications.length === 0) return [];
      const order = this.appStatuses;
      const groups = new Map();
      this.applications.forEach((app) => {
        const status = String(app?.status || "applied");
        if (!groups.has(status)) groups.set(status, []);
        groups.get(status).push(app);
      });

      const orderedStatuses = [
        ...order.filter((status) => groups.has(status)),
        ...Array.from(groups.keys()).filter((status) => !order.includes(status)),
      ];

      return orderedStatuses.map((status) => ({
        status,
        items: groups.get(status) || [],
      }));
    },

    sortedDrives() {
      const statusPriority = {
        open: 0,
        approved: 0,
        pending: 1,
        closed: 2,
      };
      const list = Array.isArray(this.drives) ? [...this.drives] : [];
      return list.sort((a, b) => {
        const left = String(a?.status || "").toLowerCase();
        const right = String(b?.status || "").toLowerCase();
        const leftRank = Object.prototype.hasOwnProperty.call(statusPriority, left) ? statusPriority[left] : 99;
        const rightRank = Object.prototype.hasOwnProperty.call(statusPriority, right) ? statusPriority[right] : 99;
        return leftRank - rightRank;
      });
    },

    diversitySegments() {
      const palette = ["#003f87", "#983c00", "#5f6b73", "#1b8752", "#7a3e00", "#0056b3", "#7b1fa2", "#455a64"];
      const safe = Array.isArray(this.diversityBreakdown) ? this.diversityBreakdown : [];
      const normalized = safe
        .map((item) => ({
          label: String(item?.label || "Unknown"),
          count: Number(item?.count || 0),
        }))
        .filter((item) => item.count > 0);

      const total = normalized.reduce((sum, item) => sum + item.count, 0);
      if (!total) return [];

      return normalized.map((item, index) => {
        const percentRaw = (item.count / total) * 100;
        return {
          ...item,
          percentRaw,
          percent: percentRaw >= 10 ? Math.round(percentRaw) : Number(percentRaw.toFixed(1)),
          color: palette[index % palette.length],
        };
      });
    },

    diversityPieSlices() {
      if (!this.diversitySegments.length) return [];

      let startAngle = -Math.PI / 2;
      return this.diversitySegments.map((segment) => {
        const sweep = (segment.percentRaw / 100) * Math.PI * 2;
        const endAngle = startAngle + sweep;
        const path = this.describePieSlice(100, 100, 92, startAngle, endAngle);
        startAngle = endAngle;
        return {
          ...segment,
          path,
        };
      });
    },

    applicantVelocityBars() {
      const drives = Array.isArray(this.recentDrives) ? this.recentDrives.slice(0, 7) : [];
      if (!drives.length) {
        return Array.from({ length: 7 }, (_, index) => ({
          height: 20,
          highlight: index === 6,
        }));
      }

      const counts = drives.map((drive) => Number(drive?.applicant_count || 0));
      const max = Math.max(...counts, 1);

      return counts.map((count, index) => {
        const scaled = Math.round((count / max) * 100);
        return {
          height: Math.max(scaled, 12),
          highlight: index === counts.length - 1,
        };
      });
    }
  },

  async mounted() {
    await this.fetchDashboard();
    await this.fetchDriveOptions(true);
    this._onWindowFocus = () => this.refreshCurrentView(true);
    window.addEventListener("focus", this._onWindowFocus);
  },

  beforeUnmount() {
    if (this._appSearchTimer) clearTimeout(this._appSearchTimer);
    if (this._onWindowFocus) window.removeEventListener("focus", this._onWindowFocus);
  },

  methods: {
    describePieSlice(cx, cy, radius, startAngle, endAngle) {
      const start = this.polarToCartesian(cx, cy, radius, startAngle);
      const end = this.polarToCartesian(cx, cy, radius, endAngle);
      const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
      return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
    },

    polarToCartesian(cx, cy, radius, angleInRadians) {
      return {
        x: cx + radius * Math.cos(angleInRadians),
        y: cy + radius * Math.sin(angleInRadians),
      };
    },

    routeForTab(tab) {
      const map = {
        overview: "/company/dashboard",
        drives: "/company/drives",
        applications: "/company/applications",
        history: "/company/hiring-history",
        profile: "/company/settings",
      };
      return map[tab] || "/company/dashboard";
    },

    goToTab(tab) {
      const target = this.routeForTab(tab);
      if (this.$route.path !== target) this.$router.push(target);
    },

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
        this.diversityBreakdown = data.diversity_breakdown || [];
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

    async fetchDriveOptions(silent = false) {
      try {
        const { data } = await ApiService.companyDrives({});
        this.appDriveOptions = data.drives || [];
      } catch {
        if (!silent) this.showAlert("Failed to load drives", "danger");
      }
    },

    async fetchApplications(silent = false) {
      this.loadingApps = true;
      try {
        if (!this.appDriveOptions.length) {
          await this.fetchDriveOptions(true);
        }
        const params = {};
        if (this.appStatusFilter) params.status = this.appStatusFilter;
        if (this.appDriveFilter) params.drive_id = this.appDriveFilter;
        if (this.appSearch) params.search = this.appSearch;
        const { data } = await ApiService.companyAllApplications(params);
        this.applications = (data.applications || []).map((app) => this.normalizeApplicationForUi(app));
      } catch {
        if (!silent) this.showAlert("Failed to load applications", "danger");
      }
      finally  { this.loadingApps = false; }
    },

    async fetchHistory(silent = false) {
      this.loadingHistory = true;
      try {
        const { data } = await ApiService.companyHistory();
        this.history = (data.history || []).map((app) => this.normalizeApplicationForUi(app));
      } catch {
        if (!silent) this.showAlert("Failed to load history", "danger");
      }
      finally  { this.loadingHistory = false; }
    },

    viewDrive(drive) {
      this.selectedDrive = drive;
      this.appStatusFilter = "";
      this.appSearch = "";
      this.appDriveFilter = String(drive.id);
      this.goToTab("applications");
      this.fetchApplications();
    },

    debouncedApplicationSearch() {
      if (this._appSearchTimer) clearTimeout(this._appSearchTimer);
      this._appSearchTimer = setTimeout(() => this.fetchApplications(true), 300);
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
        application_deadline: this.formatIstDateTimeLocal(drive.application_deadline),
        drive_date:           this.formatIstDateTimeLocal(drive.drive_date),
      };
      this.driveValidation.submitted = false;
      this.driveModal = { show: true, editing: true, driveId: drive.id };
    },

    async saveDrive() {
      this.driveValidation.submitted = true;
      if (!this.driveForm.title || !this.driveForm.description || !this.driveForm.application_deadline) {
        return this.showAlert("Title, description and deadline are required", "danger");
      }

      const deadlineIso = this.istLocalToUtcIso(this.driveForm.application_deadline);
      if (!deadlineIso) {
        return this.showAlert("Invalid application deadline format", "danger");
      }

      let driveDateIso;
      if (this.driveForm.drive_date) {
        driveDateIso = this.istLocalToUtcIso(this.driveForm.drive_date);
        if (!driveDateIso) {
          return this.showAlert("Invalid drive date format", "danger");
        }
      }

      this.savingDrive = true;
      try {
        const payload = {
          ...this.driveForm,
          application_deadline: deadlineIso,
          drive_date: driveDateIso,
        };

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
        const errorMessage =
          e?.response?.data?.message ||
          e?.response?.data?.msg ||
          e?.message ||
          "Failed to save drive";
        this.showAlert(errorMessage, "danger");
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
    async openApplicationReview(app) {
      this.applicationReviewModal = {
        show: true,
        loading: true,
        application: { ...app },
        student: null,
      };
      try {
        const { data } = await ApiService.companyApplication(app.id);
        const application = this.normalizeApplicationForUi(data.application || { ...app });
        this.applicationReviewModal.application = application;
        this.applicationReviewModal.student = application.student || null;
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed to load application details", "danger");
      } finally {
        this.applicationReviewModal.loading = false;
      }
    },

    closeApplicationReview() {
      this.applicationReviewModal = { show: false, loading: false, application: null, student: null };
    },

    async markApplicationInterview() {
      const app = this.applicationReviewModal.application;
      if (!app) return;
      try {
        await ApiService.companyUpdateApp(app.id, { status: "interview" });
        await this.fetchApplications(true);
        await this.openApplicationReview(app);
        this.showAlert("Interview call sent to student", "success");
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed", "danger");
      }
    },

    async markApplicationRejected() {
      const app = this.applicationReviewModal.application;
      if (!app) return;
      if (!confirm(`Reject ${app.student_name || "this candidate"}?`)) return;
      try {
        await ApiService.companyUpdateApp(app.id, { status: "rejected" });
        await this.fetchApplications(true);
        await this.openApplicationReview(app);
        this.showAlert("Application rejected", "success");
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed", "danger");
      }
    },

    async markApplicationOffered() {
      const app = this.applicationReviewModal.application;
      if (!app) return;
      const offerLetterUrl = prompt("Enter offer letter URL (PDF/Drive link):");
      if (!offerLetterUrl) return;
      const note = prompt("Optional message for candidate:") || "";
      try {
        await ApiService.companySendOffer(app.id, {
          offer_letter_url: offerLetterUrl,
          message: note,
        });
        await this.fetchApplications(true);
        await this.openApplicationReview(app);
        this.showAlert("Offer sent to student", "success");
      } catch (e) {
        this.showAlert(e.response?.data?.message || "Failed to send offer", "danger");
      }
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
      return new Date(dt).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    },

    normalizeApplicationForUi(app) {
      const item = { ...(app || {}) };
      item.interview_type = null;
      item.interview_date = null;
      item.remarks = this.stripLegacyInterviewRemarks(item.remarks, item.status);
      return item;
    },

    stripLegacyInterviewRemarks(remarks, status) {
      if (!remarks) return "";
      if (["interview", "interview_accepted"].includes(status)) return "";
      const lines = String(remarks)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const filtered = lines.filter((line) => {
        const lower = line.toLowerCase();
        if (line.includes("[AUTO_REJECTED_ELSEWHERE]")) return false;
        return !(lower.startsWith("interview") || lower.includes("interview date") || lower.includes("interview time"));
      });
      return filtered.join("\n").trim();
    },

    formatStatusLabel(status) {
      if (!status) return "Pending";
      return String(status)
        .split("_")
        .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : "")
        .join(" ");
    },

    formatIstDateTimeLocal(dt) {
      if (!dt) return "";
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date(dt));
      const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
      return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
    },

    istLocalToUtcIso(value) {
      if (!value) return null;
      const [datePart, timePart] = value.split("T");
      if (!datePart || !timePart) return null;
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      if ([year, month, day, hour, minute].some(Number.isNaN)) return null;
      const utcMillis = Date.UTC(year, month - 1, day, hour - 5, minute - 30, 0);
      return new Date(utcMillis).toISOString();
    },

    showAlert(msg, type = "success") {
      if (typeof window.ppToast === "function") {
        window.ppToast(msg, type);
      }
    },
  }
};