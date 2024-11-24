class DeveloperTokenInput {
  constructor(container, options = {}) {
    this.container = container;
    this.value = options.initialValue || "";
    this.onChange = options.onChange;
    this.onSubmit = options.onSubmit;
    this.isLoading = false;

    this.init();
  }

  async init() {
    // Try to load saved token from storage
    try {
      const savedToken = await StorageManager.get("developerToken");
      if (savedToken) {
        this.value = savedToken;
      }
    } catch (error) {
      console.error("Failed to load saved token:", error);
    }

    this.render();
    this.attachEventListeners();
  }

  setValue(value) {
    this.value = value;
    const input = this.container.querySelector("#developerTokenInput");
    if (input) {
      input.value = value;
    }
    this.validateInput(value);
  }

  setLoading(loading) {
    this.isLoading = loading;
    const saveBtn = this.container.querySelector("#saveToken");
    const input = this.container.querySelector("#developerTokenInput");
    if (saveBtn && input) {
      saveBtn.disabled = loading;
      input.disabled = loading;
      saveBtn.innerHTML = loading ? "Saving..." : "Save Token";
    }
  }

  validateInput(value) {
    const validationMsg = this.container.querySelector("#validationMessage");
    const saveBtn = this.container.querySelector("#saveToken");

    // Basic validation rules
    const validation = {
      isValid: false,
      message: "",
    };

    if (!value) {
      validation.message = "Developer token is required";
    } else if (value.length < 20) {
      validation.message = "Developer token should be at least 20 characters";
    } else if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      validation.message = "Invalid token format";
    } else {
      validation.isValid = true;
    }

    // Update UI
    if (validationMsg) {
      validationMsg.textContent = validation.message;
      validationMsg.className = `validation-message ${
        validation.isValid ? "valid" : "invalid"
      }`;
    }
    if (saveBtn) {
      saveBtn.disabled = !validation.isValid || this.isLoading;
    }

    return validation;
  }

  render() {
    this.container.innerHTML = `
        <div class="developer-token-container">
          <div class="form-group">
            <label for="developerTokenInput">
              Developer Token
              <span class="required">*</span>
            </label>
            <div class="input-wrapper">
              <div class="input-group">
                <input 
                  type="password" 
                  id="developerTokenInput"
                  class="form-control" 
                  value="${this.value}"
                  placeholder="Enter your Google Ads developer token"
                  ${this.isLoading ? "disabled" : ""}
                />
                <button 
                  type="button" 
                  class="btn btn-outline toggle-visibility-btn"
                  id="toggleVisibility"
                  ${this.isLoading ? "disabled" : ""}
                >
                  <span class="visibility-icon">👁️</span>
                </button>
              </div>
              <div class="validation-message" id="validationMessage"></div>
            </div>
            
            <div class="token-actions">
              <button 
                type="button" 
                class="btn btn-primary" 
                id="saveToken"
                ${!this.value || this.isLoading ? "disabled" : ""}
              >
                ${this.isLoading ? "Saving..." : "Save Token"}
              </button>
              ${
                this.value
                  ? `
                <button 
                  type="button" 
                  class="btn btn-outline-danger" 
                  id="clearToken"
                  ${this.isLoading ? "disabled" : ""}
                >
                  Clear
                </button>
              `
                  : ""
              }
            </div>
  
            <div class="help-text">
              <p>You can find your developer token in your Google Ads account:</p>
              <ol>
                <li>Sign in to your Google Ads account</li>
                <li>Click on Tools & Settings > Setup > API Center</li>
                <li>Look for the Developer Token section</li>
              </ol>
            </div>
          </div>
        </div>
      `;

    // Validate initial value
    this.validateInput(this.value);
  }

  attachEventListeners() {
    const input = this.container.querySelector("#developerTokenInput");
    const toggleBtn = this.container.querySelector("#toggleVisibility");
    const saveBtn = this.container.querySelector("#saveToken");
    const clearBtn = this.container.querySelector("#clearToken");

    // Input change handler
    input.addEventListener("input", (e) => {
      const value = e.target.value.trim();
      this.value = value;
      this.validateInput(value);

      if (this.onChange) {
        this.onChange(value);
      }
    });

    // Toggle password visibility
    toggleBtn.addEventListener("click", () => {
      const type = input.type === "password" ? "text" : "password";
      input.type = type;
      toggleBtn.querySelector(".visibility-icon").textContent =
        type === "password" ? "👁️" : "🔒";
    });

    // Save token
    saveBtn.addEventListener("click", async () => {
      const validation = this.validateInput(this.value);
      if (validation.isValid && this.onSubmit) {
        this.setLoading(true);
        try {
          await this.onSubmit(this.value);
          await StorageManager.set("developerToken", this.value);
          this.showNotification("Token saved successfully", "success");
        } catch (error) {
          console.error("Failed to save token:", error);
          this.showNotification("Failed to save token", "error");
        } finally {
          this.setLoading(false);
        }
      }
    });

    // Clear token
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        this.setLoading(true);
        try {
          await StorageManager.remove("developerToken");
          this.setValue("");
          this.render();
          this.attachEventListeners();
          this.showNotification("Token cleared", "success");
          if (this.onChange) {
            this.onChange("");
          }
        } catch (error) {
          console.error("Failed to clear token:", error);
          this.showNotification("Failed to clear token", "error");
        } finally {
          this.setLoading(false);
        }
      });
    }

    // Handle Enter key
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !saveBtn.disabled && this.onSubmit) {
        saveBtn.click();
      }
    });
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    this.container.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}
