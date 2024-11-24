class GoogleAdsManager {
  constructor() {
    this.accounts = [];
    this.selectedAccount = null;
    this.developerToken = "";
    this.customers = [];

    this.initComponents();
    this.init();
  }

  initComponents() {
    this.developerTokenInput = new DeveloperTokenInput(
      document.getElementById("developerToken"),
      {
        onChange: (value) => {
          this.developerToken = value;
          this.refreshCustomers();
        },
        onSubmit: async (value) => {
          try {
            this.developerToken = value;
            await this.refreshCustomers();
            return true;
          } catch (error) {
            throw new Error("Invalid developer token");
          }
        },
      }
    );

    this.accountSelector = new AccountSelector(
      document.getElementById("accountSelector"),
      {
        onSelect: (account) => {
          this.selectedAccount = account;
          this.refreshCustomers();
        },
      }
    );

    this.customerTable = new CustomerTable(
      document.getElementById("customerTable"),
      {
        onRefresh: async () => {
          await this.refreshCustomers();
        },
        onCreateChildMCC: async (parentId) => {
          try {
            await this.createChildMCC(parentId);
            await this.refreshCustomers();
          } catch (error) {
            console.error("Failed to create child MCC:", error);
            this.showError("Failed to create child MCC");
          }
        },
      }
    );
  }

  async init() {
    await this.loadSavedToken();
    this.setupEventListeners();
  }

  async loadSavedToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["developerToken"], (result) => {
        if (result.developerToken) {
          this.developerToken = result.developerToken;
          this.developerTokenInput.setValue(result.developerToken);
        }
        resolve();
      });
    });
  }

  async createMCCCustomer() {
    if (!this.selectedAccount || !this.developerToken) {
      this.showError("Please select an account and enter developer token");
      return;
    }

    try {
      const response = await fetch(
        "https://googleads.googleapis.com/v14/customers:createCustomer",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.developerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerClient: {
              descriptiveName: `MCC for ${this.selectedAccount.email}`,
              currencyCode: "USD",
              timeZone: "America/New_York",
            },
          }),
        }
      );

      if (response.ok) {
        this.showSuccess("MCC Customer created successfully");
        await this.refreshCustomers();
      } else {
        throw new Error("Failed to create MCC Customer");
      }
    } catch (error) {
      console.error("Error creating MCC Customer:", error);
      this.showError("Failed to create MCC Customer");
    }
  }

  async refreshCustomers() {
    if (!this.selectedAccount || !this.developerToken) return;

    try {
      this.customerTable.setLoading(true);
      const response = await fetch(
        `https://googleads.googleapis.com/v14/customers:listAccessibleCustomers`,
        {
          headers: {
            Authorization: `Bearer ${this.developerToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.customers = data.resourceNames.map(this.parseCustomerResource);
        this.customerTable.setCustomers(this.customers);
      } else {
        throw new Error("Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      this.showError("Failed to fetch customers");
    } finally {
      this.customerTable.setLoading(false);
    }
  }

  parseCustomerResource(resourceName) {
    const id = resourceName.split("/").pop();
    return {
      id,
      name: `Customer ${id}`,
      type: resourceName.includes("managers") ? "MCC" : "CUSTOMER",
    };
  }

  setupEventListeners() {
    // Add any global event listeners here if needed
  }

  showError(message) {
    // Implement error notification
    alert(message);
  }

  showSuccess(message) {
    // Implement success notification
    alert(message);
  }
}

// Initialize the manager when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new GoogleAdsManager();
});
