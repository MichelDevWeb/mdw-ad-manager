class AccountSelector {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error("Container element is required for AccountSelector");
    }

    this.container = container;
    this.accounts = [];
    this.selectedAccount = null;
    this.onSelect = options.onSelect;
    this.isLoading = false;
    this.error = null;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    try {
      if (!this.container) {
        throw new Error("Container element not found");
      }

      this.setLoading(true);
      await this.loadGoogleAccounts();
      // Try to load last selected account
      const lastSelected = await StorageManager.get("lastSelectedAccount");
      if (lastSelected) {
        this.selectedAccount = this.accounts.find(
          (acc) => acc.email === lastSelected
        );
      }
    } catch (error) {
      this.setError("Failed to load Google accounts");
      console.error("Account initialization error:", error);
    } finally {
      this.setLoading(false);
    }

    this.render();
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (this.container) {
      this.render();
    }
  }

  setError(error) {
    this.error = error;
    if (this.container) {
      this.render();
    }
  }

  async loadGoogleAccounts() {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: "getGoogleAccount" },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to get account info");
      }

      const accountInfo = response.account;
      this.accounts = [
        {
          id: accountInfo.id,
          email: accountInfo.email,
          name: accountInfo.name || accountInfo.email.split("@")[0],
          imageSrc:
            accountInfo.picture ||
            `https://www.google.com/s2/photos/profile/${accountInfo.email}`,
        },
      ];

      return this.accounts;
    } catch (error) {
      console.error("Failed to load Google account:", error);
      throw error;
    }
  }

  async refreshAccounts() {
    try {
      this.setLoading(true);
      this.setError(null);
      await this.loadGoogleAccounts();
      this.render();
    } catch (error) {
      this.setError("Failed to refresh accounts");
      console.error("Account refresh error:", error);
    } finally {
      this.setLoading(false);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="account-dropdown">
        ${
          this.selectedAccount
            ? `
          <div class="selected-account" id="toggleDropdown">
            <div class="account-info">
              <img src="${this.selectedAccount.imageSrc}" alt="${this.selectedAccount.name}" class="account-avatar">
              <span class="account-name">${this.selectedAccount.name}</span>
            </div>
            <span class="dropdown-arrow">▼</span>
          </div>
        `
            : `
          <div class="no-account-selected" id="toggleDropdown">
            Select an account
            <span class="dropdown-arrow">▼</span>
          </div>
        `
        }

        <div class="accounts-dropdown-menu" id="accountsMenu">
          ${
            this.isLoading
              ? `
            <div class="loading">Loading accounts...</div>
          `
              : `
            ${this.accounts
              .map(
                (account) => `
              <div class="account-option ${
                this.selectedAccount?.email === account.email ? "active" : ""
              }"
                   data-email="${account.email}">
                <img src="${account.imageSrc}" alt="${
                  account.name
                }" class="account-avatar">
                <div class="account-details">
                  <div class="account-name">${account.name}</div>
                  <div class="account-email">${account.email}</div>
                </div>
                ${
                  this.selectedAccount?.email === account.email
                    ? '<div class="check-mark">✓</div>'
                    : ""
                }
              </div>
            `
              )
              .join("")}
            <div class="dropdown-divider"></div>
            <div class="account-option add-account" id="addAccountBtn">
              <div class="add-icon">+</div>
              <div class="account-details">Add another account</div>
            </div>
          `
          }
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const toggleDropdown = this.container.querySelector("#toggleDropdown");
    const accountsMenu = this.container.querySelector("#accountsMenu");

    // Toggle dropdown
    toggleDropdown?.addEventListener("click", (e) => {
      accountsMenu.classList.toggle("show");
      toggleDropdown.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) {
        accountsMenu.classList.remove("show");
        toggleDropdown?.classList.remove("active");
      }
    });

    // Account selection
    const accountOptions = this.container.querySelectorAll(
      ".account-option:not(.add-account)"
    );
    accountOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const email = option.dataset.email;
        this.handleAccountSelect(email);
        accountsMenu.classList.remove("show");
        toggleDropdown?.classList.remove("active");
      });
    });

    // Add account button
    const addAccountBtn = this.container.querySelector("#addAccountBtn");
    addAccountBtn?.addEventListener("click", () => this.handleAddAccount());
  }

  async handleAccountSelect(email) {
    const account = this.accounts.find((acc) => acc.email === email);
    if (account) {
      this.selectedAccount = account;
      await StorageManager.set("lastSelectedAccount", email);

      if (this.onSelect) {
        this.onSelect(account);
      }

      this.render();
    }
  }

  async handleAddAccount() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "addGoogleAccount",
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to add account");
      }

      const accountInfo = response.account;

      // Add the new account if it doesn't exist
      const existingAccount = this.accounts.find(
        (acc) => acc.email === accountInfo.email
      );

      if (!existingAccount) {
        const newAccount = {
          id: accountInfo.id,
          email: accountInfo.email,
          name: accountInfo.name || accountInfo.email.split("@")[0],
          imageSrc:
            accountInfo.picture ||
            `https://www.google.com/s2/photos/profile/${accountInfo.email}`,
        };

        this.accounts.push(newAccount);
        this.selectedAccount = newAccount;

        if (this.onSelect) {
          this.onSelect(newAccount);
        }
      }

      this.render();
    } catch (error) {
      this.setError("Failed to add account");
      console.error("Add account error:", error);
    }
  }
}

console.log("Redirect URI:", chrome.identity.getRedirectURL());
