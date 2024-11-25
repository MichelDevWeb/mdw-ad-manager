class GoogleAdsAPI {
  constructor(developerToken) {
    this.developerToken = developerToken;
    this.baseUrl = "https://googleads.googleapis.com/v18";
  }

  setDeveloperToken(token) {
    this.developerToken = token;
  }

  async listAccessibleCustomers(accessToken) {
    try {
      // First get all accessible customers
      const rootCustomer = await this.getAccessibleCustomers(accessToken);

      if (!rootCustomer.success) {
        throw new Error(rootCustomer.error);
      }

      // Then get customer details using GAQL
      const response = await fetch(
        `${this.baseUrl}/customers/${rootCustomer.id}/googleAds:searchStream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": this.developerToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
              SELECT
                customer_client.id,
                customer_client.descriptive_name,
                customer_client.level,
                customer_client.manager,
                customer_client.currency_code,
                customer_client.time_zone,
                customer_client.resource_name
              FROM customer_client
              WHERE customer_client.status != "CLOSED"
              ORDER BY customer_client.descriptive_name ASC
            `,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(
          errorData.error?.message || "Failed to fetch customers"
        );
      }

      const data = await response.json();
      return {
        success: true,
        customers: this.parseCustomers(data.results || []),
      };
    } catch (error) {
      console.error("List customers error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAccessibleCustomers(accessToken) {
    try {
      const response = await fetch(
        `${this.baseUrl}/customers:listAccessibleCustomers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": this.developerToken,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to get accessible customers"
        );
      }

      const data = await response.json();
      if (!data.resourceNames?.[0]) {
        throw new Error("No accessible customers found");
      }

      // Extract customer ID from resource name (format: customers/1234567890)
      const customerId = data.resourceNames[0].split("/")[1];

      return {
        success: true,
        id: customerId,
      };
    } catch (error) {
      console.error("Get accessible customers error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  parseCustomers(results) {
    return results.map((result) => {
      const client = result.customer_client;
      return {
        id: client.id,
        name: client.descriptive_name || `Customer ${client.id}`,
        type: client.manager ? "MCC" : "CUSTOMER",
        level: client.level,
        currencyCode: client.currency_code,
        timeZone: client.time_zone,
        resourceName: client.resource_name,
      };
    });
  }

  // Helper method to handle API errors
  handleApiError(error) {
    if (error.error?.details) {
      return error.error.details.map((detail) => detail.message).join(". ");
    }
    return error.error?.message || "Unknown API error";
  }
}
