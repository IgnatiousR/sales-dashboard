const API_BASE_URL = "https://autobizz-425913.uc.r.appspot.com";

export interface AuthResponse {
  token: string;
  expire: number;
}

export interface SalesResponse {
  results: {
    TotalSales: Array<{
      day: string;
      totalSale: number;
    }>;
    Sales: Array<{
      _id: string;
      date: string;
      price: number;
      customerEmail: string;
      customerPhone: string;
      __v: number;
    }>;
  };
  pagination: {
    before: string;
    after: string;
  };
}

export const getAuthToken = async (): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/getAuthorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenType: "frontEndTest" }),
  });

  if (!response.ok) {
    throw new Error("Authorization failed");
  }

  const data: AuthResponse = await response.json();
  return data.token;
};

export const fetchSalesData = async (
  token: string,
  params: {
    startDate?: string;
    endDate?: string;
    priceMin?: string;
    email?: string;
    phone?: string;
    sortBy?: string;
    sortOrder?: string;
    after?: string;
    before?: string;
  }
): Promise<SalesResponse> => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });

  const response = await fetch(`${API_BASE_URL}/sales?${searchParams}`, {
    headers: {
      "X-AUTOBIZZ-TOKEN": token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch sales data");
  }

  return response.json();
};
