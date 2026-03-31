/**
 * Common Components & Utilities
 */

// ── Empty State Component ──
const EmptyState = {
  props: {
    icon: { type: String, default: 'bi-inbox' },
    title: { type: String, default: 'No data found' },
    message: { type: String, default: 'There are no items to display' },
    action: { type: Object, default: null }, // { label: 'Create', onClick: fn }
  },
  template: `
    <div class="empty-state pp-card">
      <i :class="['bi', icon]"></i>
      <h6 class="fw-bold mt-3 mb-1">{{ title }}</h6>
      <p class="text-muted mb-3" style="font-size:.88rem;">{{ message }}</p>
      <button v-if="action" @click="action.onClick" class="btn btn-sm btn-primary">
        {{ action.label }}
      </button>
    </div>
  `,
};

// ── Loading Skeleton Component ──
const SkeletonLoader = {
  props: {
    rows: { type: Number, default: 3 },
    type: { type: String, default: 'card' }, // card, table, list
  },
  template: `
    <div class="skeleton-container">
      <template v-if="type === 'card'">
        <div class="skeleton-card skeleton-pulse" v-for="i in rows" :key="i">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-text"></div>
          <div class="skeleton-line skeleton-line-text" style="width:80%"></div>
        </div>
      </template>

      <template v-else-if="type === 'table'">
        <div class="skeleton-table skeleton-pulse">
          <div class="skeleton-table-row" v-for="i in rows" :key="i">
            <div class="skeleton-line skeleton-line-cell"></div>
            <div class="skeleton-line skeleton-line-cell"></div>
            <div class="skeleton-line skeleton-line-cell"></div>
            <div class="skeleton-line skeleton-line-cell" style="width:60%"></div>
          </div>
        </div>
      </template>

      <template v-else-if="type === 'list'">
        <div class="skeleton-list skeleton-pulse" v-for="i in rows" :key="i">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-line-title"></div>
            <div class="skeleton-line skeleton-line-text" style="width:80%"></div>
          </div>
        </div>
      </template>
    </div>
  `,
};

// ── Pagination Component ──
const Pagination = {
  props: {
    currentPage: { type: Number, default: 1 },
    totalPages: { type: Number, required: true },
    totalItems: { type: Number, required: true },
    itemsPerPage: { type: Number, default: 10 },
  },
  template: `
    <div class="pagination-wrapper">
      <div class="pagination-info text-muted" style="font-size:.82rem;">
        Showing {{ startItem }}-{{ endItem }} of {{ totalItems }} items
      </div>

      <nav aria-label="Page navigation">
        <ul class="pagination mb-0">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="$emit('page-change', 1)" :disabled="currentPage === 1">
              <i class="bi bi-chevron-double-left"></i>
            </button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="$emit('page-change', currentPage - 1)" :disabled="currentPage === 1">
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>

          <li v-for="page in visiblePages" :key="page" class="page-item" :class="{ active: page === currentPage }">
            <button class="page-link" @click="$emit('page-change', page)">{{ page }}</button>
          </li>

          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="$emit('page-change', currentPage + 1)" :disabled="currentPage === totalPages">
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="$emit('page-change', totalPages)" :disabled="currentPage === totalPages">
              <i class="bi bi-chevron-double-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  `,
  computed: {
    startItem() {
      return (this.currentPage - 1) * this.itemsPerPage + 1;
    },
    endItem() {
      return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    },
    visiblePages() {
      const pages = [];
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, this.currentPage - delta); i <= Math.min(this.totalPages - 1, this.currentPage + delta); i++) {
        range.push(i);
      }

      if (this.currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (this.currentPage + delta < this.totalPages - 1) {
        rangeWithDots.push('...', this.totalPages);
      } else {
        rangeWithDots.push(this.totalPages);
      }

      return rangeWithDots.filter((p, i, arr) => p !== arr[i - 1]);
    },
  },
};

// ── Confirmation Dialog Utility ──
const ConfirmDialog = {
  props: {
    title: { type: String, default: 'Confirm Action' },
    message: { type: String, default: 'Are you sure?' },
    okText: { type: String, default: 'Confirm' },
    cancelText: { type: String, default: 'Cancel' },
    isDangerous: { type: Boolean, default: false },
  },
  template: `
    <div class="modal fade show d-block" style="background:rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title">{{ title }}</h6>
            <button type="button" class="btn-close" @click="$emit('cancel')"></button>
          </div>
          <div class="modal-body">{{ message }}</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="$emit('cancel')">{{ cancelText }}</button>
            <button type="button" :class="['btn', isDangerous ? 'btn-danger' : 'btn-primary']" @click="$emit('confirm')">
              {{ okText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};

// ── Helper function for confirmations ──
const confirmAction = (title, message, okText = 'Confirm', isDangerous = false) => {
  return new Promise((resolve) => {
    const handleConfirm = () => {
      resolve(true);
      dialog.remove?.();
    };
    const handleCancel = () => {
      resolve(false);
      dialog.remove?.();
    };

    // In production, integrate with your modal system
    // This is a simple implementation
    const confirmed = confirm(`${title}\n\n${message}`);
    resolve(confirmed);
  });
};
