const StudentDashboard = {
  props: {
    section: {
      type: String,
      default: "overview",
    },
  },
  template: `
  <div class="portal-page py-4 role-shell">

    <aside class="role-sidebar pp-card" role="navigation" aria-label="Student navigation menu">
      <div class="role-sidebar-head">
        <div class="portal-subtitle">Student</div>
        <h6>Navigation</h6>
      </div>
      <nav class="role-sidebar-nav">
        <button
          v-for="tab in tabs"
          :key="'student_sb_' + tab.key"
          type="button"
          :class="['role-sidebar-link', { active: activeTab === tab.key }]"
          :aria-current="activeTab === tab.key ? 'page' : false"
          :aria-label="tab.label"
          @click="goToTab(tab.key)">
          <i :class="tab.icon" aria-hidden="true"></i>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <div class="role-main">

    <div class="portal-hero flex-wrap">
      <div>
        <div class="portal-subtitle">Student Command Center</div>
        <h2 class="mb-0">Welcome back, {{ student.full_name || 'Student' }}</h2>
        <p>{{ student.branch || 'Branch' }} · Year {{ student.year || '—' }} · CGPA {{ student.cgpa || '—' }}</p>
      </div>
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <button class="btn btn-sm btn-outline-secondary" @click="goToTab('profile')">
          <i class="bi bi-person-gear me-1"></i>Profile
        </button>
        <button class="btn btn-sm btn-outline-primary" @click="exportCSV" :disabled="exporting">
          <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-download me-1"></i>Export history
        </button>
      </div>
    </div>

    <!-- ── TAB: Overview ─────────────────────────────────────── -->
    <div v-if="activeTab==='overview'">
      <div class="student-overview-layout">
        <div class="pp-card mb-3">
          <div class="student-kpi-grid">
            <div class="student-kpi-card applied">
              <div class="student-kpi-label">Applied</div>
              <div class="student-kpi-value">{{ stats.total_applied || 0 }}</div>
            </div>
            <div class="student-kpi-card selected">
              <div class="student-kpi-label">Joined</div>
              <div class="student-kpi-value">{{ stats.joined || 0 }}</div>
            </div>
            <div class="student-kpi-card shortlisted">
              <div class="student-kpi-label">Offered</div>
              <div class="student-kpi-value">{{ stats.offered || 0 }}</div>
            </div>
            <div class="student-kpi-card waiting">
              <div class="student-kpi-label">Interview</div>
              <div class="student-kpi-value">{{ stats.interview || 0 }}</div>
            </div>
          </div>

          <div class="student-funnel-wrap mt-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0 fw-bold">Placement funnel</h6>
            </div>
            <div class="student-funnel-bar">
              <div
                v-for="segment in funnelSegments"
                :key="'funnel_'+segment.key"
                class="student-funnel-segment"
                :style="{ width: segment.width + '%', background: segment.color }"
              ></div>
            </div>
            <div class="student-funnel-legend">
              <span v-for="segment in funnelSegments" :key="'legend_'+segment.key">
                <i class="bi bi-circle-fill" :style="{ color: segment.color }"></i>
                {{ segment.label }} ({{ segment.value }})
              </span>
            </div>
          </div>
        </div>

        <div class="student-overview-bottom">
          <div class="pp-card">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0 fw-bold">Recent applications</h6>
              <button class="btn btn-sm btn-outline-secondary" @click="goToTab('applications')">View all</button>
            </div>
            <div v-if="recentApps.length" class="d-flex flex-column gap-2">
              <div v-for="a in recentApps.slice(0,5)" :key="'recent_wire_'+a.id" class="student-app-row">
                <div>
                  <div class="fw-semibold">{{ a.company_name }}</div>
                  <div class="text-muted" style="font-size:.8rem;">{{ a.drive_title }}</div>
                </div>
                <button class="btn btn-sm btn-outline-primary" @click="openRecentApplicationDetails(a)">View</button>
              </div>
            </div>
            <div v-else class="empty-state" style="padding:1.2rem .6rem;">
              <i class="bi bi-file-earmark-text"></i>No applications yet
            </div>
          </div>

          <div class="d-flex flex-column gap-3">
            <div class="pp-card">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0 fw-bold">Open for you</h6>
                <span class="badge rounded-pill bg-light text-primary">{{ eligibleDrives.length }} drives</span>
              </div>
              <div v-if="eligibleDrives.length" class="d-flex flex-column gap-2">
                <div v-for="d in eligibleDrives.slice(0,2)" :key="'open_for_you_'+d.id" class="student-drive-row">
                  <div>
                    <div class="fw-semibold">{{ d.company_name }}</div>
                    <div class="text-muted" style="font-size:.78rem;">{{ d.title }} · Due {{ formatDate(d.application_deadline) }}</div>
                  </div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary" @click="openDriveReview(d)">Review</button>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state" style="padding:1rem .4rem;">
                <i class="bi bi-briefcase"></i>No new eligible drives
              </div>
            </div>

            <div class="pp-card">
              <h6 class="fw-bold mb-2">Quick Actions</h6>
              <div class="d-grid gap-2">
                <a class="btn btn-outline-secondary text-start" href="https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/" target="_blank" rel="noopener noreferrer"><i class="bi bi-file-earmark-pdf me-2"></i>Resume Guidelines</a>
                <button class="btn btn-outline-secondary text-start" @click="openAskAiModal"><i class="bi bi-stars me-2"></i>Ask AI</button>
                <button class="btn btn-outline-secondary text-start" @click="goToTab('profile')"><i class="bi bi-person-check me-2"></i>Profile completeness ({{ profileCompleteness }}%)</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Recent application details modal ───────────────── -->
    <div v-if="recentAppModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto"
      @click.self="closeRecentApplicationDetails">
      <div class="pp-card" style="width:100%;max-width:620px;margin:auto;">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h6 class="fw-600 mb-1">{{ recentAppModal.item?.drive_title || 'Application details' }}</h6>
            <div class="text-muted" style="font-size:.86rem;">{{ recentAppModal.item?.company_name || '—' }}</div>
          </div>
          <span :class="'status-badge ' + applicationStatusClass(recentAppModal.item)">
            {{ applicationStatusLabel(recentAppModal.item) }}
          </span>
        </div>
        <div v-if="applicationInterviewSubLabel(recentAppModal.item)" class="text-muted" style="font-size:.8rem;">
          {{ applicationInterviewSubLabel(recentAppModal.item) }}
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Applied on</div>
            <div class="fw-500">{{ formatDate(recentAppModal.item?.applied_at) }}</div>
          </div>
          <div class="col-md-6">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Current status</div>
            <div class="fw-500">{{ applicationStatusLabel(recentAppModal.item) }}</div>
          </div>
          <div class="col-12" v-if="recentAppModal.item?.remarks">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Remarks</div>
            <div class="portal-panel mt-1" style="white-space:pre-wrap;font-size:.88rem;">{{ recentAppModal.item.remarks }}</div>
          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end mt-4">
          <button class="btn btn-outline-secondary" @click="closeRecentApplicationDetails">Close</button>
          <button class="btn btn-primary" @click="goToTab('applications'); closeRecentApplicationDetails();">Open applications</button>
        </div>
      </div>
    </div>

    <!-- ── Ask AI modal ───────────────────────────────────── -->
    <div v-if="askAiModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto"
      @click.self="closeAskAiModal">
      <div class="pp-card" style="width:100%;max-width:760px;margin:auto;">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h6 class="fw-600 mb-1">Ask AI</h6>
            <div class="text-muted" style="font-size:.86rem;">Chat with AI using your profile and application context from backend.</div>
          </div>
          <button class="btn btn-sm btn-outline-secondary" @click="closeAskAiModal">Close</button>
        </div>

        <div class="portal-panel ask-ai-transcript-panel" ref="askAiChat">
          <div
            v-for="(msg, idx) in askAiModal.messages"
            :key="'ask_ai_msg_' + idx"
            :class="['ask-ai-message-row', msg.role === 'user' ? 'user' : 'assistant']">
            <div class="ask-ai-message-row-meta">{{ msg.role === 'user' ? 'You' : 'Gemini' }}</div>
            <div class="ask-ai-message-row-body" v-html="formatAiAnswer(msg.text)"></div>
          </div>
          <div v-if="askAiModal.loading" class="ask-ai-loading-indicator">
            <span class="spinner-border spinner-border-sm"></span>
            Gemini is thinking...
          </div>
        </div>

        <div class="mt-3">
          <label class="form-label">Ask your own question</label>
          <textarea
            v-model="askAiModal.input"
            class="form-control"
            rows="3"
            :disabled="askAiModal.loading"
            placeholder="Ask about roles, expected package, skills gap, or interview strategy for your profile."></textarea>
        </div>

        <div class="ask-ai-composer-actions mt-3">
          <div class="d-flex gap-2 justify-content-end align-items-center">
            <div class="ask-ai-quick-popover-wrap">
              <button class="btn btn-outline-secondary" @click="askAiModal.showQuickQuestions = !askAiModal.showQuickQuestions" :disabled="askAiModal.loading">
                <i class="bi bi-chat-square-text me-1"></i>{{ askAiModal.showQuickQuestions ? 'Hide prompts' : 'Quick prompts' }}
              </button>
              <div v-if="askAiModal.showQuickQuestions" class="ask-ai-quick-popover" @click.stop>
                <div class="ask-ai-quick-panel-head">Quick prompts</div>
                <div class="d-flex flex-column gap-2">
                  <button
                    v-for="q in askAiQuickQuestions"
                    :key="q"
                    class="btn btn-sm btn-outline-primary text-start ask-ai-prompt-btn"
                    :disabled="askAiModal.loading"
                    @click="handleQuickPrompt(q)">
                    {{ q }}
                  </button>
                </div>
              </div>
            </div>
            <button class="btn btn-outline-secondary" @click="askAiModal.input=''" :disabled="askAiModal.loading">Clear</button>
            <button class="btn btn-primary" @click="sendAskAiMessage()" :disabled="askAiModal.loading">
              <i class="bi bi-send me-1"></i>Send
            </button>
          </div>
        </div>
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
                <span v-if="d.is_eligible" :class="'status-badge ' + (d.already_applied ? 'approved' : 'waiting')">
                  {{ d.already_applied ? 'Applied' : 'Not applied' }}
                </span>
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
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-outline-primary" @click="openDriveReview(d)">Review</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Drive review modal ─────────────────────────────── -->
    <div v-if="driveReviewModal.show"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1050;
             display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto"
      @click.self="closeDriveReview">
      <div class="pp-card" style="width:100%;max-width:720px;margin:auto;">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h6 class="fw-600 mb-1">{{ driveReviewModal.item.title || 'Drive Review' }}</h6>
            <div class="text-muted" style="font-size:.86rem;">{{ driveReviewModal.item.company_name || 'Company' }}</div>
          </div>
          <div class="d-flex gap-2 flex-wrap justify-content-end">
            <span v-if="driveReviewModal.item.id" :class="'status-badge ' + (driveReviewModal.item.is_eligible ? 'approved' : 'waiting')">
              {{ driveReviewModal.item.is_eligible ? 'Eligible' : 'Not eligible' }}
            </span>
            <span :class="'status-badge ' + (driveReviewModal.item.already_applied ? 'approved' : 'waiting')">
              {{ driveReviewModal.item.already_applied ? 'Applied' : 'Not applied' }}
            </span>
          </div>
        </div>

        <div v-if="driveReviewModal.loading" class="pp-spinner"><div class="spinner-border spinner-border-sm"></div></div>
        <div v-else class="row g-3">
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
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Min CGPA</div>
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
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Apply Deadline</div>
            <div class="fw-500">{{ formatDate(driveReviewModal.item.application_deadline) }}</div>
          </div>
          <div class="col-12" v-if="driveReviewModal.item.ineligible_reason">
            <div class="pp-alert alert-warning mb-0">
              <i class="bi bi-exclamation-triangle me-2"></i>{{ driveReviewModal.item.ineligible_reason }}
            </div>
          </div>
          <div class="col-12">
            <div class="text-muted text-uppercase" style="font-size:.68rem;letter-spacing:.08em;font-weight:700;">Description</div>
            <div class="portal-panel mt-1" style="white-space:pre-wrap;font-size:.88rem;">{{ driveReviewModal.item.description || '—' }}</div>
          </div>
        </div>

        <div class="d-flex gap-2 justify-content-end mt-4">
          <button class="btn btn-outline-secondary" @click="closeDriveReview">Close</button>
          <button
            v-if="driveReviewModal.item.already_applied && (!resolveApplicationStatus(driveReviewModal.item) || resolveApplicationStatus(driveReviewModal.item) === 'applied')"
            class="btn btn-outline-danger"
            @click="unapplyDrive(driveReviewModal.item)"
            :disabled="applying===driveReviewModal.item.id">
            <span v-if="applying===driveReviewModal.item.id" class="spinner-border spinner-border-sm me-2"></span>
            Withdraw
          </button>
          <button
            v-else-if="driveReviewModal.item.already_applied"
            class="btn btn-outline-success"
            disabled>
            <i class="bi bi-check-circle me-1"></i>Applied
          </button>
          <button
            v-else-if="driveReviewModal.item.is_eligible"
            class="btn btn-primary"
            @click="applyDrive(driveReviewModal.item)"
            :disabled="applying===driveReviewModal.item.id || hasJoinedOffer">
            <span v-if="applying===driveReviewModal.item.id" class="spinner-border spinner-border-sm me-2"></span>
            {{ hasJoinedOffer ? 'Joined elsewhere' : 'Apply' }}
          </button>
          <button
            v-else
            class="btn btn-outline-secondary"
            disabled>
            Not eligible
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB: My Applications ──────────────────────────────── -->
    <div v-if="activeTab==='applications'">
      <div class="pp-card mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label" for="appStatusFilter">Filter by status</label>
            <select v-model="appStatusFilter" id="appStatusFilter" class="form-select" aria-label="Filter applications by status" @change="fetchApplications">
              <option value="">All statuses</option>
              <option v-for="s in appStatuses" :key="s" :value="s">{{ formatStatusOptionLabel(s) }}</option>
            </select>
          </div>
          <div class="col-md-8">
            <label class="form-label" for="appSearchInput">Search applications</label>
            <div class="input-group">
              <span class="input-group-text" aria-hidden="true"><i class="bi bi-search"></i></span>
              <input id="appSearchInput" v-model="appSearch" class="form-control" placeholder="Company, job title..."
                aria-label="Search applications by company or job title"
                @input="debouncedAppSearch"/>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingApps" class="pp-spinner">
        <SkeletonLoader type="list" :rows="3" />
      </div>

      <div v-else-if="filteredApplications.length===0" class="empty-state pp-card" role="status" aria-live="polite">
        <i class="bi bi-file-earmark-text"></i>
        <h6>No applications found</h6>
        <p v-if="appSearch || appStatusFilter" style="font-size:.88rem;color:var(--hint)">Try adjusting your filters or search terms</p>
        <p v-else style="font-size:.88rem;color:var(--hint)">Browse drives and apply to get started!</p>
        <button class="btn btn-primary btn-sm" aria-label="Browse all drives to apply" @click="goToTab('drives')">Browse drives</button>
      </div>

      <template v-else>
        <div class="d-flex flex-column gap-3 mb-4">
          <div v-for="a in paginatedApps" :key="a.id" class="pp-card">
            <div class="d-flex align-items-start justify-content-between gap-3 flex-wrap">
              <div class="flex-grow-1">
                <div class="fw-500">{{ a.drive_title }}</div>
                <div class="text-muted" style="font-size:.85rem">{{ a.company_name }}</div>
                <div class="mt-2 d-flex flex-wrap gap-2">
                  <span :class="'status-badge ' + applicationStatusClass(a)">{{ applicationStatusLabel(a) }}</span>
                  <span v-if="applicationInterviewSubLabel(a)" class="text-muted" style="font-size:.8rem;">
                    {{ applicationInterviewSubLabel(a) }}
                  </span>
                  <span class="text-muted" style="font-size:.8rem">
                    Applied {{ formatDate(a.applied_at) }}
                  </span>
                </div>
                <div v-if="a.remarks" class="mt-1 text-muted" style="font-size:.82rem">
                  <i class="bi bi-chat-left-text me-1"></i>{{ a.remarks }}
                </div>
              </div>
              <div v-if="!isLockedByAcceptedElsewhere(a)" class="d-flex flex-column gap-2 align-items-stretch">
                <button
                  v-if="a.status==='interview' && (a._raw_status || a.status) === 'interview'"
                  class="btn btn-sm btn-outline-primary"
                  @click="respondToInterview(a, 'accept')"
                >
                  <i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Accept interview
                </button>
                <button
                  v-if="a.status==='interview'"
                  class="btn btn-sm btn-outline-danger"
                  @click="respondToInterview(a, 'cancel')"
                >
                  <i class="bi bi-x-circle me-1" aria-hidden="true"></i>Cancel application
                </button>
                <button
                  v-if="a.status==='offered'"
                  class="btn btn-sm btn-outline-primary"
                  :aria-label="'View offer letter for ' + a.drive_title + ' at ' + a.company_name"
                  @click="viewOffer(a)"
                >
                  <i class="bi bi-file-earmark-text me-1" aria-hidden="true"></i>View offer
                </button>
                <button
                  v-if="a.status==='offered'"
                  class="btn btn-sm btn-success"
                  :aria-label="'Accept offer from ' + a.company_name + ' for ' + a.drive_title"
                  @click="respondToOffer(a, 'accept')"
                >
                  <i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Accept offer
                </button>
                <button
                  v-if="a.status==='offered'"
                  class="btn btn-sm btn-outline-danger"
                  :aria-label="'Reject offer from ' + a.company_name + ' for ' + a.drive_title"
                  @click="respondToOffer(a, 'reject')"
                >
                  <i class="bi bi-x-circle me-1" aria-hidden="true"></i>Reject offer
                </button>
                <button v-if="a.status==='applied'" class="btn btn-sm btn-outline-danger"
                  :aria-label="'Withdraw application for ' + a.drive_title + ' at ' + a.company_name"
                  @click="withdrawApp(a)">
                  <i class="bi bi-x-circle me-1" aria-hidden="true"></i>Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="appsPagination.totalPages > 1" class="pagination-wrapper" role="navigation" aria-label="Applications pagination">
          <div class="pagination-info text-muted" style="font-size:.82rem;" aria-live="polite" aria-atomic="true">
            Showing {{ appsPagination.startItem }}-{{ appsPagination.endItem }} of {{ appsPagination.total }} applications
          </div>
          <div class="d-flex gap-2">
            <button @click="appCurrentPage = Math.max(1, appCurrentPage - 1)" :disabled="appCurrentPage === 1"
              class="btn btn-sm btn-outline-secondary" aria-label="Previous page">
              <i class="bi bi-chevron-left" aria-hidden="true"></i>
            </button>
            <span class="btn btn-sm btn-outline-secondary disabled" aria-current="page">{{ appCurrentPage }} / {{ appsPagination.totalPages }}</span>
            <button @click="appCurrentPage = Math.min(appsPagination.totalPages, appCurrentPage + 1)"
              :disabled="appCurrentPage === appsPagination.totalPages" class="btn btn-sm btn-outline-secondary" aria-label="Next page">
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- ── TAB: History ──────────────────────────────────────── -->
    <div v-if="activeTab==='history'">
      <div v-if="loadingHistory" class="pp-spinner">
        <SkeletonLoader type="table" :rows="5" />
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
          <i class="bi bi-clock-history"></i>
          <h6>No placement history yet</h6>
          <p style="font-size:.88rem;color:var(--hint)">Your application history will appear here once you apply to drives.</p>
        </div>

        <div v-else class="pp-card">
          <div class="table-responsive">
            <table class="pp-table" role="table" aria-label="Application history table">
              <thead>
                <tr>
                  <th class="sortable" @click="setSortBy('#')" style="width:0;cursor:auto;" scope="col">#</th>
                  <th class="sortable" @click="setSortBy('company_name')" scope="col">
                    Company <span class="sort-indicator" v-if="historySortBy==='company_name'" aria-hidden="true"><i :class="'bi bi-arrow-'+(historySortDir==='asc'?'up':'down')"></i></span>
                  </th>
                  <th class="sortable" @click="setSortBy('drive_title')" scope="col">
                    Drive <span class="sort-indicator" v-if="historySortBy==='drive_title'" aria-hidden="true"><i :class="'bi bi-arrow-'+(historySortDir==='asc'?'up':'down')"></i></span>
                  </th>
                  <th class="sortable" @click="setSortBy('applied_at')" scope="col">
                    Applied <span class="sort-indicator" v-if="historySortBy==='applied_at'" aria-hidden="true"><i :class="'bi bi-arrow-'+(historySortDir==='asc'?'up':'down')"></i></span>
                  </th>
                  <th class="sortable" @click="setSortBy('status')" scope="col">
                    Result <span class="sort-indicator" v-if="historySortBy==='status'" aria-hidden="true"><i :class="'bi bi-arrow-'+(historySortDir==='asc'?'up':'down')"></i></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(a,i) in sortedHistory" :key="a.id">
                  <td class="text-muted" style="width:0;">{{ i+1 }}</td>
                  <td>{{ a.company_name }}</td>
                  <td>{{ a.drive_title }}</td>
                  <td>{{ formatDate(a.applied_at) }}</td>
                  <td>
                    <span :class="'status-badge ' + applicationStatusClass(a)">{{ applicationStatusLabel(a) }}</span>
                    <div v-if="applicationInterviewSubLabel(a)" class="text-muted" style="font-size:.76rem;">{{ applicationInterviewSubLabel(a) }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
  </div>
  `,

  data() {
    return {
      activeTab: this.section || "overview",
      tabs: [
        { key: "overview",      label: "Overview",      icon: "bi bi-house" },
        { key: "drives",        label: "Browse drives", icon: "bi bi-briefcase" },
        { key: "applications",  label: "Applications",  icon: "bi bi-file-earmark-text" },
        { key: "history",       label: "History",       icon: "bi bi-clock-history" },
        { key: "profile",       label: "Profile",       icon: "bi bi-person" },
      ],
      student:       {},
      stats:         { total_applied: 0, accepted: 0, interview: 0, joined: 0, rejected: 0, eligible_drives: 0 },
      eligibleDrives: [],
      recentApps:    [],
      allDrives:     [],
      myApplications:[],
      history:       [],
      hasJoinedOffer: false,
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
      appSearch:     "",
      appStatuses:   ["applied","interview","offered","joined","void_joined_elsewhere","rejected"],
      appCurrentPage: 1,
      appPageSize:   10,
      profileForm:   { full_name: "", phone: "", dob: "" },
      savingProfile: false,
      resumeFile:    null,
      uploadingResume: false,
      driveReviewModal: { show: false, item: {}, loading: false },
      recentAppModal: { show: false, item: null },
      askAiModal: { show: false, input: "", messages: [], loading: false, showQuickQuestions: false },
      askAiQuickQuestions: [
        "Which roles should I target with my current profile?",
        "What package range can I realistically expect this year?",
        "What skills should I improve in the next 30 days?",
        "Which companies are best for my branch and CGPA?",
      ],
      alert:         { msg: "", type: "success" },
      _searchTimer:  null,
      _appSearchTimer: null,
      _onWindowFocus: null,
      historySortBy: 'applied_at',
      historySortDir: 'desc',
    };
  },

  computed: {
    profileCompleteness() {
      const checks = [
        !!this.student?.full_name,
        !!this.student?.phone,
        !!this.student?.dob,
        !!this.student?.branch,
        this.student?.year !== null && this.student?.year !== undefined && this.student?.year !== "",
        this.student?.cgpa !== null && this.student?.cgpa !== undefined && this.student?.cgpa !== "",
        !!this.student?.resume_path,
      ];
      const completed = checks.filter(Boolean).length;
      return Math.round((completed / checks.length) * 100);
    },
    funnelSegments() {
      const rawSegments = [
        { key: "applied", label: "Applied", value: Number(this.stats.total_applied || 0), color: "#1e5da9" },
        { key: "offered", label: "Offered", value: Number(this.stats.offered || 0), color: "#e09a27" },
        { key: "joined", label: "Joined", value: Number(this.stats.joined || 0), color: "#2f9d6c" },
        { key: "interview", label: "Interview", value: Number(this.stats.interview || 0), color: "#9ca3af" },
      ];
      const total = rawSegments.reduce((sum, item) => sum + item.value, 0);
      if (!total) {
        return rawSegments.map((item) => ({ ...item, width: 25 }));
      }
      return rawSegments.map((item) => ({
        ...item,
        width: Math.max((item.value / total) * 100, item.value > 0 ? 8 : 0),
      }));
    },
    statCards() {
      return [
        { label: "Applied",     value: this.stats.total_applied, icon: "bi bi-send-fill",      bg: "#eff6ff", color: "#1d4ed8" },
        { label: "Offered", value: this.stats.offered, icon: "bi bi-star-fill", bg: "#fef3c7", color: "#92400e" },
        { label: "Joined",      value: this.stats.joined,        icon: "bi bi-trophy-fill",    bg: "#dcfce7", color: "#166534" },
        { label: "Rejected",    value: this.stats.rejected,      icon: "bi bi-x-circle-fill",  bg: "#fee2e2", color: "#991b1b" },
      ];
    },
    historySummary() {
      const h = this.history;
      const displayStatus = (app) => this.applicationStatusClass(app);
      return [
        { key: "applied",     label: "Total applied",  value: h.length },
        { key: "offered",     label: "Offered",        value: h.filter(a => displayStatus(a) === "offered").length },
        { key: "joined",      label: "Joined",         value: h.filter(a => displayStatus(a) === "joined").length },
        { key: "void_joined_elsewhere", label: "Offer accepted elsewhere", value: h.filter(a => displayStatus(a) === "void_joined_elsewhere").length },
        { key: "interview",   label: "Interview",      value: h.filter(a => displayStatus(a) === "interview").length },
        { key: "rejected",    label: "Rejected",       value: h.filter(a => displayStatus(a) === "rejected").length },
      ];
    },
    filteredApplications() {
      let apps = this.myApplications;

      if (this.appSearch) {
        const q = this.appSearch.toLowerCase();
        apps = apps.filter(a =>
          a.company_name?.toLowerCase().includes(q) ||
          a.drive_title?.toLowerCase().includes(q)
        );
      }

      return apps;
    },
    paginatedApps() {
      const start = (this.appCurrentPage - 1) * this.appPageSize;
      const end = start + this.appPageSize;
      return this.filteredApplications.slice(start, end);
    },
    appsPagination() {
      const total = this.filteredApplications.length;
      const totalPages = Math.ceil(total / this.appPageSize);
      const start = (this.appCurrentPage - 1) * this.appPageSize + 1;
      const end = Math.min(this.appCurrentPage * this.appPageSize, total);
      return {
        total,
        totalPages,
        startItem: total > 0 ? start : 0,
        endItem: end,
        hasNext: this.appCurrentPage < totalPages,
        hasPrev: this.appCurrentPage > 1,
      };
    },
    sortedHistory() {
      if (!this.history || this.history.length === 0) return [];

      let sorted = [...this.history];

      if (this.historySortBy && this.historySortBy !== '#') {
        sorted.sort((a, b) => {
          const valA = this.historySortBy === 'status'
            ? this.applicationStatusClass(a)
            : a[this.historySortBy];
          const valB = this.historySortBy === 'status'
            ? this.applicationStatusClass(b)
            : b[this.historySortBy];

          if (valA == null) return 1;
          if (valB == null) return -1;

          if (this.historySortBy === 'status') {
            const statusRank = {
              applied: 1,
              interview: 2,
              offered: 3,
              joined: 4,
              void_joined_elsewhere: 5,
              rejected: 6,
            };
            const rankA = statusRank[valA] ?? 99;
            const rankB = statusRank[valB] ?? 99;
            return this.historySortDir === 'asc' ? rankA - rankB : rankB - rankA;
          }

          if (typeof valA === 'string') {
            const cmp = valA.localeCompare(valB);
            return this.historySortDir === 'asc' ? cmp : -cmp;
          }

          return this.historySortDir === 'asc' ? valA - valB : valB - valA;
        });
      }

      return sorted;
    },
  },

  watch: {
    section(next) {
      this.activeTab = next || "overview";
    },
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
  },

  beforeUnmount() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (this._appSearchTimer) clearTimeout(this._appSearchTimer);
    if (this._onWindowFocus) window.removeEventListener("focus", this._onWindowFocus);
  },

  methods: {
    routeForTab(tab) {
      const map = {
        overview: "/student/dashboard",
        drives: "/student/drives",
        applications: "/student/applications",
        history: "/student/history",
        profile: "/student/profile",
      };
      return map[tab] || "/student/dashboard";
    },

    goToTab(tab) {
      const target = this.routeForTab(tab);
      if (this.$route.path !== target) this.$router.push(target);
    },

    async openDriveReview(drive) {
      if (!drive?.id) return;
      this.driveReviewModal = { show: true, item: { ...drive }, loading: true };
      try {
        const { data } = await ApiService.studentDrive(drive.id);
        const normalized = data.drive || { ...drive };
        if (!normalized.application_status && normalized.application?.status) {
          normalized.application_status = normalized.application.status;
        }
        if (!normalized.application_id && normalized.application?.id) {
          normalized.application_id = normalized.application.id;
        }
        this.driveReviewModal.item = normalized;
      } catch {
        ppToast("Could not load full drive details", "warning");
        this.driveReviewModal.item = { ...drive };
      } finally {
        this.driveReviewModal.loading = false;
      }
    },

    closeDriveReview() {
      this.driveReviewModal = { show: false, item: {}, loading: false };
    },

    openRecentApplicationDetails(app) {
      this.recentAppModal = {
        show: true,
        item: this.normalizeApplicationForUi(app),
      };
    },

    closeRecentApplicationDetails() {
      this.recentAppModal = { show: false, item: null };
    },

    openAskAiModal() {
      this.askAiModal = {
        show: true,
        input: "",
        loading: false,
        showQuickQuestions: false,
        messages: [
          {
            role: "assistant",
            text: "Hi! I can help with role targeting, package expectations, and skill roadmap using your current profile context.",
          },
        ],
      };
      this.$nextTick(() => this.scrollAskAiToBottom());
    },

    closeAskAiModal() {
      this.askAiModal = { show: false, input: "", messages: [], loading: false, showQuickQuestions: false };
    },

    handleQuickPrompt(question) {
      this.askAiModal.showQuickQuestions = false;
      this.sendAskAiMessage(question);
    },

    async sendAskAiMessage(prefilledQuestion = "") {
      const question = String(prefilledQuestion || this.askAiModal.input || "").trim();
      if (!question) return;

      const userMessage = { role: "user", text: question };
      this.askAiModal.messages.push(userMessage);
      this.askAiModal.input = "";
      this.askAiModal.loading = true;
      this.$nextTick(() => this.scrollAskAiToBottom());

      try {
        const { data } = await ApiService.studentAskAi({ question });
        const answer = String(data?.reply || "").trim();
        if (!answer) throw new Error("No reply returned");

        this.askAiModal.messages.push({ role: "assistant", text: answer });
        this.$nextTick(() => this.scrollAskAiToBottom());
      } catch (error) {
        this.askAiModal.messages.push({
          role: "assistant",
          text: `I could not fetch a response from Gemini. ${error?.response?.data?.message || error?.message || "Please try again."}`,
        });
        this.$nextTick(() => this.scrollAskAiToBottom());
      } finally {
        this.askAiModal.loading = false;
      }
    },

    scrollAskAiToBottom() {
      const el = this.$refs.askAiChat;
      if (el) el.scrollTop = el.scrollHeight;
    },

    escapeHtml(text) {
      return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    formatAiInline(text) {
      const safe = this.escapeHtml(text);
      return safe
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
    },

    formatAiAnswer(text) {
      const source = String(text || "").replace(/\r\n/g, "\n").trim();
      if (!source) return "";

      const lines = source.split("\n");
      const chunks = [];
      let listType = null;
      let listItems = [];
      let codeLines = [];
      let inCode = false;
      let inSection = false;

      const flushList = () => {
        if (!listItems.length) return;
        const tag = listType === "ol" ? "ol" : "ul";
        const html = `<${tag} class="ask-ai-answer-list">${listItems.join("")}</${tag}>`;
        chunks.push(html);
        listItems = [];
        listType = null;
      };

      const flushCode = () => {
        if (!codeLines.length) return;
        chunks.push(`<pre class="ask-ai-code-block"><code>${this.escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
      };

      const closeSection = () => {
        if (inSection) {
          chunks.push(`</div>`);
          inSection = false;
        }
      };

      lines.forEach((line) => {
        const trimmed = line.trimEnd();

        if (trimmed.startsWith("```")) {
          if (inCode) {
            flushCode();
            inCode = false;
          } else {
            flushList();
            inCode = true;
          }
          return;
        }

        if (inCode) {
          codeLines.push(line);
          return;
        }

        // Handle numbered sections (1), (2), etc. as special heading style
        const numberedSection = trimmed.match(/^(\d+)\)\s+(.+)$/);
        if (numberedSection) {
          flushList();
          closeSection();
          chunks.push(`<div class="ask-ai-section" style="display:flex;gap:.6rem;align-items:flex-start;margin:.5rem 0 .8rem;">`);
          chunks.push(`<div class="ask-ai-step" style="flex:0 0 auto;width:1.6rem;height:1.6rem;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--brand);color:#fff;font-size:.75rem;font-weight:800;">${numberedSection[1]}</div>`);
          chunks.push(`<div style="flex:1;min-width:0;"><h3 class="ask-ai-section-title" style="margin:.1rem 0 .35rem;font-weight:800;font-size:1rem;letter-spacing:-.02em;">${this.formatAiInline(numberedSection[2])}</h3>`);
          inSection = true;
          return;
        }

        const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (heading) {
          flushList();
          closeSection();
          const level = Math.min(heading[1].length + 2, 6);
          chunks.push(`<h${level} class="ask-ai-heading" style="margin:.75rem 0 .5rem;font-weight:800;letter-spacing:-.02em;">${this.formatAiInline(heading[2])}</h${level}>`);
          return;
        }

        if (!trimmed) {
          flushList();
          return;
        }

        const ordered = trimmed.match(/^(\d+)[\).:-]\s+(.+)$/);
        if (ordered) {
          if (listType && listType !== "ol") flushList();
          listType = "ol";
          listItems.push(`<li>${this.formatAiInline(ordered[2])}</li>`);
          return;
        }

        if (/^[-*•]\s+/.test(trimmed)) {
          if (listType && listType !== "ul") flushList();
          listType = "ul";
          const itemText = trimmed.replace(/^[-*•]\s+/, "");
          listItems.push(`<li>${this.formatAiInline(itemText)}</li>`);
          return;
        }

        flushList();
        chunks.push(`<p style="margin:0 0 .65rem;line-height:1.68;color:var(--text);">${this.formatAiInline(trimmed)}</p>`);
      });

      flushList();
      flushCode();
      closeSection();
      return chunks.join("");
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
        const { data } = await ApiService.studentDashboard();
        this.student        = data.student;
        this.stats          = data.stats;
        this.hasJoinedOffer = !!data.has_joined_offer;
        this.eligibleDrives = data.eligible_drives || [];
        this.recentApps     = (data.recent_applications || []).map((app) => this.normalizeApplicationForUi(app));
        this.stats.eligible_drives = this.eligibleDrives.length;
        this.profileForm.full_name = this.student.full_name;
        this.profileForm.phone     = this.student.phone || "";
        this.profileForm.dob       = this.student.dob   || "";
      } catch (error) {
        if (!silent) {
          ppToast("Failed to load dashboard", "danger");
          console.error("Dashboard fetch error:", error);
        }
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
        this.allDrives = (data.drives || []).filter((drive) => !drive.already_applied);
      } catch (error) {
        if (!silent) {
          ppToast("Failed to load drives", "danger");
          console.error("Drives fetch error:", error);
        }
      }
      finally  { this.loadingDrives = false; }
    },

    async fetchApplications(silent = false) {
      this.loadingApps = true;
      try {
        const params = this.appStatusFilter ? { status: this.appStatusFilter } : {};
        const { data } = await ApiService.studentApplications(params);
        this.myApplications = (data.applications || []).map((app) => this.normalizeApplicationForUi(app));
        this.appCurrentPage = 1;
      } catch (error) {
        if (!silent) {
          ppToast("Failed to load applications", "danger");
          console.error("Applications fetch error:", error);
        }
      }
      finally  { this.loadingApps = false; }
    },

    async fetchHistory(silent = false) {
      this.loadingHistory = true;
      try {
        const { data } = await ApiService.studentHistory();
        this.history = (data.history || []).map((app) => this.normalizeApplicationForUi(app));
      } catch (error) {
        if (!silent) {
          ppToast("Failed to load history", "danger");
          console.error("History fetch error:", error);
        }
      }
      finally  { this.loadingHistory = false; }
    },

    async applyDrive(drive) {
      if (this.hasJoinedOffer) {
        ppToast("You already joined a company. New applications are disabled.", "warning");
        return;
      }
      this.applying = drive.id;
      try {
        const { data } = await ApiService.studentApply(drive.id);
        drive.already_applied = true;
        drive.application_id = data?.application?.id || drive.application_id;
        drive.application_status = data?.application?.status || "applied";
        drive.application = data?.application || drive.application;
        this.stats.total_applied++;
        await this.refreshCurrentView(true);
        if (this.driveReviewModal.show && this.driveReviewModal.item?.id === drive.id) {
          this.closeDriveReview();
        }
        ppToast(`Applied to "${drive.title}" successfully!`, "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Failed to apply to drive", "danger");
        console.error("Apply drive error:", e);
      } finally { this.applying = null; }
    },

    async unapplyDrive(drive) {
      const appId = drive?.application_id || drive?.application?.id;
      if (!appId) {
        ppToast("No active application found for this drive", "warning");
        return;
      }

      const confirmed = confirm(`Withdraw application for "${drive.title}"?`);
      if (!confirmed) return;

      this.applying = drive.id;
      try {
        await ApiService.studentWithdraw(appId);
        drive.already_applied = false;
        drive.application_id = null;
        drive.application_status = null;
        drive.application = null;
        await this.refreshCurrentView(true);
        ppToast("Application withdrawn successfully", "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Failed to unapply", "danger");
        console.error("Unapply error:", e);
      } finally {
        this.applying = null;
      }
    },

    resolveApplicationStatus(drive) {
      return drive?.application_status || drive?.application?.status || null;
    },

    async withdrawApp(app) {
      const confirmed = confirm(`Are you sure you want to withdraw your application for "${app.drive_title}"?\n\nThis action cannot be undone.`);
      if (!confirmed) return;

      try {
        await ApiService.studentWithdraw(app.id);
        this.myApplications = this.myApplications.filter(a => a.id !== app.id);
        this.stats.total_applied--;
        await this.refreshCurrentView(true);
        ppToast("Application withdrawn successfully", "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Failed to withdraw application", "danger");
        console.error("Withdraw error:", e);
      }
    },

    viewOffer(app) {
      const text = app.remarks || "No offer document link provided.";
      const match = text.match(/https?:\/\/\S+/i);
      if (match && confirm("Open offer document in a new tab?")) {
        window.open(match[0], "_blank", "noopener,noreferrer");
        return;
      }
      ppToast(text, "info");
    },

    async respondToOffer(app, decision = "accept") {
      const message = decision === "accept"
        ? "Are you sure you want to accept this offer? This will lock your placement and void all other active applications."
        : "Are you sure you want to reject this offer?";

      const confirmed = confirm(message);
      if (!confirmed) return;

      try {
        const { data } = await ApiService.studentOfferResponse(app.id, { decision });
        app.status = data.application?.status || (decision === "accept" ? "joined" : "rejected");
        app.remarks = data.application?.remarks || app.remarks;
        await this.refreshCurrentView(true);
        const message = data.message || "Offer response recorded";
        ppToast(message, "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Failed to update offer response", "danger");
        console.error("Offer response error:", e);
      }
    },

    async respondToInterview(app, decision = "accept") {
      const confirmed = confirm(
        decision === "accept"
          ? "Accept this interview call?"
          : "Cancel this application after interview call?"
      );
      if (!confirmed) return;

      try {
        const { data } = await ApiService.studentInterviewResponse(app.id, { decision });
        app.status = data.application?.status || (decision === "accept" ? "offered" : "rejected");
        await this.refreshCurrentView(true);
        ppToast(data.message || "Interview response recorded", "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Failed to update interview response", "danger");
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
        ppToast("Profile updated successfully", "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Failed to update profile", "danger");
        console.error("Profile update error:", e);
      }
      finally  { this.savingProfile = false; }
    },

    async uploadResume() {
      if (!this.resumeFile) return;
      this.uploadingResume = true;
      try {
        await ApiService.studentUploadResume(this.resumeFile);
        this.student.resume_path = this.resumeFile.name;
        this.resumeFile = null;
        ppToast("Resume uploaded successfully", "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Failed to upload resume", "danger");
        console.error("Resume upload error:", e);
      }
      finally  { this.uploadingResume = false; }
    },

    async exportCSV() {
      this.exporting = true;
      try {
        await ApiService.studentExport();
        ppToast("Export started — you'll receive an email when ready", "success");
      } catch (e) {
        ppToast(e.response?.data?.message || "Export failed", "danger");
        console.error("Export error:", e);
      }
      finally  { this.exporting = false; }
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

    isJoinedStatus(status) {
      return ["joined", "selected", "hired"].includes(String(status || "").toLowerCase());
    },

    isLockedByAcceptedElsewhere(app) {
      return !!this.hasJoinedOffer && !this.isJoinedStatus(app?.status);
    },

    applicationStatusLabel(app) {
      if (this.isLockedByAcceptedElsewhere(app)) return "offer accepted elsewhere";
      return app?.status || "—";
    },

    applicationInterviewSubLabel(app) {
      const rawStatus = app?._raw_status || app?.status;
      if (rawStatus === "interview") return "Called for interview";
      if (rawStatus === "interview_accepted") return "Interview accepted";
      return "";
    },

    applicationStatusClass(app) {
      if (this.isLockedByAcceptedElsewhere(app)) return "void_joined_elsewhere";
      return app?.status || "applied";
    },

    formatStatusOptionLabel(status) {
      const normalized = String(status || "").toLowerCase();
      if (normalized === "void_joined_elsewhere") return "offer accepted elsewhere";
      return String(status || "").replace(/_/g, " ");
    },

    normalizeApplicationForUi(app) {
      const item = { ...(app || {}) };
      item._raw_status = item.status || "applied";
      if (item.status === "interview_accepted") item.status = "interview";
      item.interview_type = null;
      item.interview_date = null;
      item.remarks = this.stripLegacyInterviewRemarks(item.remarks, item.status);
      return item;
    },

    stripLegacyInterviewRemarks(remarks, status) {
      if (!remarks) return "";
      if (["interview", "offered"].includes(status)) return "";
      const lines = String(remarks)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const filtered = lines.filter((line) => {
        const lower = line.toLowerCase();
        return !(lower.startsWith("interview") || lower.includes("interview date") || lower.includes("interview time"));
      });
      return filtered.join("\n").trim();
    },

    setSortBy(field) {
      if (field === '#') return;
      if (this.historySortBy === field) {
        this.historySortDir = this.historySortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.historySortBy = field;
        this.historySortDir = field === 'applied_at' ? 'desc' : 'asc';
      }
    },
  }
};