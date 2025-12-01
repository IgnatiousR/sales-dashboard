import { AuthResponse, SalesResponse, SalesQueryParams } from "@/types";

const API_BASE_URL = "https://autobizz-425913.uc.r.appspot.com";

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
  params: SalesQueryParams
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
