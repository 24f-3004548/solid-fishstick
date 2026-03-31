/**
 * Data Management Utilities
 */

const DataUtils = {
  /**
   * Paginate an array
   */
  paginate(items, page = 1, pageSize = 10) {
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);

    return {
      items: items.slice(start, end),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  /**
   * Search items by multiple fields
   */
  search(items, query, fields) {
    if (!query || !query.trim()) return items;

    const q = query.toLowerCase().trim();
    return items.filter(item =>
      fields.some(field => {
        const value = DataUtils.getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(q);
      })
    );
  },

  /**
   * Get nested object value by dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((val, key) => val?.[key], obj);
  },

  /**
   * Sort items by field
   */
  sort(items, field, direction = 'asc') {
    const sorted = [...items];
    sorted.sort((a, b) => {
      const valA = DataUtils.getNestedValue(a, field);
      const valB = DataUtils.getNestedValue(b, field);

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'string') {
        return direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return direction === 'asc' ? valA - valB : valB - valA;
    });
    return sorted;
  },

  /**
   * Filter items by predicate
   */
  filter(items, predicate) {
    return items.filter(predicate);
  },

  /**
   * Chain operations: search -> filter -> sort -> paginate
   */
  pipeline(items, options = {}) {
    let result = items;

    if (options.searchQuery && options.searchFields) {
      result = this.search(result, options.searchQuery, options.searchFields);
    }

    if (options.filter) {
      result = this.filter(result, options.filter);
    }

    if (options.sortBy) {
      result = this.sort(result, options.sortBy, options.sortDir || 'asc');
    }

    if (options.page && options.pageSize) {
      return this.paginate(result, options.page, options.pageSize);
    }

    return {
      items: result,
      pagination: {
        page: 1,
        pageSize: result.length,
        total: result.length,
        totalPages: 1,
      },
    };
  },

  /**
   * Debounce search function
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Group items by field
   */
  groupBy(items, field) {
    return items.reduce((groups, item) => {
      const key = DataUtils.getNestedValue(item, field);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  },

  /**
   * Unique items by field
   */
  uniqueBy(items, field) {
    const seen = new Set();
    return items.filter(item => {
      const key = DataUtils.getNestedValue(item, field);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
};

/**
 * Table Mixin for Vue components
 * Provides pagination, sorting, search functionality
 */
const TableMixin = {
  data() {
    return {
      _table: {
        sortBy: null,
        sortDir: 'asc',
        searchQuery: '',
        currentPage: 1,
        pageSize: 10,
        loading: false,
        allItems: [],
        error: null,
      },
    };
  },

  methods: {
    initTable(items = [], pageSize = 10) {
      this._table.allItems = items;
      this._table.pageSize = pageSize;
      this._table.currentPage = 1;
    },

    setTableItems(items) {
      this._table.allItems = items;
      this._table.currentPage = 1;
    },

    goToPage(page) {
      this._table.currentPage = Math.max(1, page);
    },

    setPageSize(size) {
      this._table.pageSize = size;
      this._table.currentPage = 1;
    },

    setSort(field, direction) {
      this._table.sortBy = field;
      this._table.sortDir = direction || (this._table.sortDir === 'asc' ? 'desc' : 'asc');
      this._table.currentPage = 1;
    },

    setSearch(query) {
      this._table.searchQuery = query;
      this._table.currentPage = 1;
    },

    getTableData() {
      return DataUtils.pipeline(this._table.allItems, {
        searchQuery: this._table.searchQuery,
        searchFields: this.tableSearchFields || [],
        sortBy: this._table.sortBy,
        sortDir: this._table.sortDir,
        page: this._table.currentPage,
        pageSize: this._table.pageSize,
        filter: this.tableFilter,
      });
    },

    get paginatedItems() {
      return this.getTableData().items;
    },

    get pagination() {
      return this.getTableData().pagination;
    },
  },

  computed: {
    debouncedSearch() {
      return DataUtils.debounce((query) => this.setSearch(query), 300);
    },
  },
};
