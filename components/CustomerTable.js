class CustomerTable {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error("Container element is required for CustomerTable");
    }

    this.container = container;
    this.customers = [];
    this.onRefresh = options.onRefresh;
    this.onCreateChildMCC = options.onCreateChildMCC;
    this.isLoading = false;
    this.error = null;
    this.sortField = "name";
    this.sortDirection = "asc";
    this.searchTerm = "";
    this.selectedCustomer = null;

    // Wait for DOM to be ready before initializing
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.render();
  }

  setCustomers(customers) {
    this.customers = customers;
    this.render();
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.render();
  }

  setError(error) {
    this.error = error;
    this.render();
  }

  sortCustomers(customers) {
    return [...customers].sort((a, b) => {
      let aValue = a[this.sortField];
      let bValue = b[this.sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (this.sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }

  filterCustomers(customers) {
    if (!this.searchTerm) return customers;

    const searchLower = this.searchTerm.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchLower) ||
        customer.id.toLowerCase().includes(searchLower)
    );
  }

  render() {
    let filteredCustomers = this.filterCustomers(this.customers);
    let sortedCustomers = this.sortCustomers(filteredCustomers);

    this.container.innerHTML = `
      <div class="customer-table-container">
        ${
          this.error
            ? `
          <div class="alert alert-danger">
            ${this.error}
            <button class="btn-close" data-dismiss="alert">&times;</button>
          </div>
        `
            : ""
        }

        <div class="table-header">
          <div class="table-title">
            <h3>Customers</h3>
            <span class="customer-count">
              ${sortedCustomers.length} customer${
      sortedCustomers.length !== 1 ? "s" : ""
    }
            </span>
          </div>
          
          <div class="table-actions">
            <div class="search-box">
              <input 
                type="text" 
                class="form-control" 
                placeholder="Search customers..."
                value="${this.searchTerm}"
                id="customerSearch"
              >
            </div>
            
            <button 
              class="btn btn-primary refresh-btn" 
              id="refreshCustomersBtn"
              ${this.isLoading ? "disabled" : ""}
            >
              ${
                this.isLoading
                  ? `
                <span class="spinner"></span> Refreshing...
              `
                  : "↻ Refresh"
              }
            </button>
          </div>
        </div>

        ${
          this.isLoading
            ? `
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading customers...</p>
          </div>
        `
            : `
          ${
            sortedCustomers.length === 0
              ? `
            <div class="empty-state">
              ${
                this.searchTerm
                  ? `
                <p>No customers found matching "${this.searchTerm}"</p>
                <button class="btn btn-link" id="clearSearch">Clear search</button>
              `
                  : `
                <p>No customers found</p>
                <p class="help-text">Create your first MCC customer to get started</p>
              `
              }
            </div>
          `
              : `
            <div class="table-responsive">
              <table class="customer-table">
                <thead>
                  <tr>
                    <th class="sortable" data-sort="id">
                      ID
                      ${this.getSortIcon("id")}
                    </th>
                    <th class="sortable" data-sort="name">
                      Name
                      ${this.getSortIcon("name")}
                    </th>
                    <th class="sortable" data-sort="type">
                      Type
                      ${this.getSortIcon("type")}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedCustomers
                    .map((customer) => this.renderCustomerRow(customer))
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        `
        }
      </div>
    `;

    this.attachEventListeners();
  }

  renderCustomerRow(customer) {
    return `
      <tr class="customer-row ${
        this.selectedCustomer?.id === customer.id ? "selected" : ""
      }"
          data-customer-id="${customer.id}">
        <td class="customer-id">${customer.id}</td>
        <td class="customer-name">
          <div class="customer-name-wrapper">
            ${customer.name}
            ${
              customer.type === "MCC"
                ? `
              <span class="badge badge-primary">MCC</span>
            `
                : ""
            }
          </div>
        </td>
        <td class="customer-type">${customer.type}</td>
        <td class="customer-actions">
          ${
            customer.type === "MCC"
              ? `
            <button 
              class="btn btn-sm btn-outline-primary create-child-btn"
              data-customer-id="${customer.id}"
              title="Create Child MCC"
            >
              Create Child MCC
            </button>
          `
              : ""
          }
          <button 
            class="btn btn-sm btn-outline-secondary view-details-btn"
            data-customer-id="${customer.id}"
            title="View Details"
          >
            View Details
          </button>
        </td>
      </tr>
    `;
  }

  getSortIcon(field) {
    if (this.sortField !== field) {
      return '<span class="sort-icon">⇅</span>';
    }
    return this.sortDirection === "asc"
      ? '<span class="sort-icon active">↑</span>'
      : '<span class="sort-icon active">↓</span>';
  }

  attachEventListeners() {
    // Refresh button
    const refreshBtn = this.container.querySelector("#refreshCustomersBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (this.onRefresh) {
          this.onRefresh();
        }
      });
    }

    // Search input
    const searchInput = this.container.querySelector("#customerSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        this.render();
      });
    }

    // Clear search
    const clearSearchBtn = this.container.querySelector("#clearSearch");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        this.searchTerm = "";
        this.render();
      });
    }

    // Sort headers
    const sortHeaders = this.container.querySelectorAll(".sortable");
    sortHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const field = header.dataset.sort;
        if (this.sortField === field) {
          this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
        } else {
          this.sortField = field;
          this.sortDirection = "asc";
        }
        this.render();
      });
    });

    // Create child MCC buttons
    const createChildBtns =
      this.container.querySelectorAll(".create-child-btn");
    createChildBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const customerId = btn.dataset.customerId;
        if (this.onCreateChildMCC) {
          this.onCreateChildMCC(customerId);
        }
      });
    });

    // Row selection
    const customerRows = this.container.querySelectorAll(".customer-row");
    customerRows.forEach((row) => {
      row.addEventListener("click", () => {
        const customerId = row.dataset.customerId;
        const customer = this.customers.find((c) => c.id === customerId);
        this.selectedCustomer = customer;
        this.render();
      });
    });

    // Error dismiss
    const dismissBtn = this.container.querySelector('[data-dismiss="alert"]');
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        this.setError(null);
      });
    }
  }
}
