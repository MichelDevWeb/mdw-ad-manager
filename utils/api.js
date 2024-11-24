class GoogleAdsAPI {
  constructor(developerToken) {
    this.developerToken = developerToken;
    this.baseUrl = "https://googleads.googleapis.com/v14";
  }

  async getCustomers() {
    const response = await fetch(
      `${this.baseUrl}/customers:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
        },
      }
    );
    return response.json();
  }

  async createMCCCustomer(data) {
    const response = await fetch(`${this.baseUrl}/customers:createCustomer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.developerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}
