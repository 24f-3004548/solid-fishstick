const App = {
  components: { Navbar },
  data() {
    return {
      toasts: [],
      _toastTimerMap: {},
      _onToastEvent: null,
    };
  },
  created() {
    window.ppToast = (message, type = "danger", timeoutMs = 4000) => {
      this.pushToast(message, type, timeoutMs);
    };
  },
  mounted() {
    this._onToastEvent = (event) => {
      const detail = event?.detail || {};
      this.pushToast(detail.message || "Something went wrong", detail.type || "danger", detail.timeoutMs || 4000);
    };
    window.addEventListener("pp-toast", this._onToastEvent);
  },
  beforeUnmount() {
    if (this._onToastEvent) {
      window.removeEventListener("pp-toast", this._onToastEvent);
    }
    Object.values(this._toastTimerMap).forEach((timer) => clearTimeout(timer));
    delete window.ppToast;
  },
  methods: {
    pushToast(message, type = "danger", timeoutMs = 4000) {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const toast = { id, message, type };
      this.toasts.push(toast);
      this._toastTimerMap[id] = setTimeout(() => this.removeToast(id), timeoutMs);
    },
    removeToast(id) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
      if (this._toastTimerMap[id]) {
        clearTimeout(this._toastTimerMap[id]);
        delete this._toastTimerMap[id];
      }
    },
  },
  template: `
    <div class="app-layout">
      <Navbar />
      <main class="page-content">
        <router-view />
      </main>

      <div class="pp-toast-stack">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['pp-alert', 'alert-' + toast.type, 'pp-toast-item']"
        >
          <i :class="toast.type === 'success' ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-circle-fill'"></i>
          <div style="flex:1">{{ toast.message }}</div>
          <button class="btn btn-sm p-0 border-0 bg-transparent" @click="removeToast(toast.id)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>
  `
};