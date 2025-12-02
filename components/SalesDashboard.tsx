"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
} from "lucide-react";

const API_BASE = "https://autobizz-425913.uc.r.appspot.com";

interface Sale {
  _id: string;
  date: string;
  price: number;
  customerEmail: string;
  customerPhone: string;
  __v: number;
}

interface TotalSale {
  day: string;
  totalSale: number;
}

interface TokenData {
  token: string;
  timestamp: number;
}

export default function SalesDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-01-31");
  const [priceMin, setPriceMin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Sort states
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");

  // Pagination states
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [paginationData, setPaginationData] = useState({ after: "", before: "" });

  // Data states
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [totalSalesData, setTotalSalesData] = useState<TotalSale[]>([]);

  // Check if token is expired (older than 1 hour)
  const isTokenExpired = (timestamp: number): boolean => {
    const oneHour = 60 * 60 * 1000;
    return Date.now() - timestamp > oneHour;
  };

  // Get authorization token
  const getToken = async () => {
    try {
      console.log("🔐 [Client] Fetching authorization token...");

      const response = await fetch(`${API_BASE}/getAuthorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenType: "frontEndTest" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [Client] Authorization failed:", response.status, errorText);
        throw new Error(`Authorization failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ [Client] Authorization Response:", data);

      // Store token with timestamp in localStorage
      const tokenData: TokenData = {
        token: data.token,
        timestamp: Date.now(),
      };

      localStorage.setItem("authToken", JSON.stringify(tokenData));
      setToken(data.token);
      console.log("💾 [Client] Token stored in localStorage");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get authorization token";
      setError(errorMessage);
      console.error("❌ [Client] Authorization Error:", err);
    }
  };

  // Initialize token - check localStorage first
  useEffect(() => {
    const storedTokenData = localStorage.getItem("authToken");

    if (storedTokenData) {
      try {
        const tokenData: TokenData = JSON.parse(storedTokenData);

        if (isTokenExpired(tokenData.timestamp)) {
          console.log("⏰ [Client] Token expired, fetching new token...");
          localStorage.removeItem("authToken");
          getToken();
        } else {
          console.log("✅ [Client] Using cached token from localStorage: ", tokenData.token);
          setToken(tokenData.token);
        }
      } catch (err) {
        console.error("❌ [Client] Error parsing stored token:", err);
        localStorage.removeItem("authToken");
        getToken();
      }
    } else {
      console.log("🆕 [Client] No cached token, fetching new token...");
      getToken();
    }
  }, []);

  // Auto-refresh token after 1 hour
  useEffect(() => {
    if (!token) return;

    const oneHour = 60 * 60 * 1000;
    const timer = setTimeout(() => {
      console.log("⏰ [Client] Token expired, auto-refreshing...");
      localStorage.removeItem("authToken");
      getToken();
    }, oneHour);

    return () => clearTimeout(timer);
  }, [token]);

  // // Initialize token
  // useEffect(() => {
  //   console.log("🆕 [Client] Fetching new token...");
  //   getToken();
  // }, []);

  // Build sales URL for SWR
  const buildSalesUrl = () => {
    if (!token) return null;

    const paramsObj: Record<string, string> = {
      startDate,
      endDate,
      priceMin: priceMin || "",
      email: email || "",
      phone: phone || "",
      sortBy,
      sortOrder,
    };

    // Add pagination token - ONLY ONE at a time
    if (before) {
      paramsObj.before = before;
      paramsObj.after = "";
    } else if (after) {
      paramsObj.after = after;
      paramsObj.before = "";
    } else {
      paramsObj.after = "";
      paramsObj.before = "";
    }

    const params = new URLSearchParams(paramsObj);
    console.log("🔗 [Client] Building sales URL with params:", paramsObj);
    return `${API_BASE}/sales?${params}`;
  };

  // SWR fetcher function
  const salesFetcher = async (url: string) => {
    console.log("📊 [Client] Fetching sales data from:", url);

    const response = await fetch(url, {
      headers: { "X-AUTOBIZZ-TOKEN": token! },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [Client] Sales API Error - Status:", response.status, errorText);
      throw new Error(`Failed to fetch sales data: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ [Client] Sales Data Response:", data);
    console.log("📈 [Client] Total Sales Count:", data.results?.TotalSales?.length || 0);
    console.log("🛒 [Client] Sales Items Count:", data.results?.Sales?.length || 0);
    console.log("📄 [Client] Pagination:", data.pagination);

    return data;
  };

  // Use SWR for data fetching
  const {
    data: salesResponse,
    error: salesError,
    isLoading: salesLoading,
  } = useSWR(buildSalesUrl(), salesFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  // Update local state when SWR data changes
  useEffect(() => {
    if (salesResponse) {
      console.log("🔄 [Client] Updating local state from SWR data");
      setSalesData(salesResponse.results.Sales || []);
      setTotalSalesData(salesResponse.results.TotalSales || []);
      setPaginationData(salesResponse.pagination || { after: "", before: "" });
    }
  }, [salesResponse]);

  // Update error state
  useEffect(() => {
    if (salesError) {
      const errorMessage = salesError instanceof Error ? salesError.message : "Unknown error";
      setError(errorMessage);
      console.error("❌ [Client] Sales Fetch Error:", salesError);
    } else if (error && !salesError) {
      // Clear error if it was from sales fetch and now resolved
      setError(null);
    }
  }, [error, salesError]);

  const handleSort = (column: string) => {
    console.log("🔀 [Client] Sorting by:", column);
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setAfter("");
    setBefore("");
  };

  const handleNextPage = () => {
    if (paginationData.after) {
      console.log("➡️ [Client] Going to next page with after token:", paginationData.after);
      setAfter(paginationData.after);
      setBefore("");
    }
  };

  const handlePrevPage = () => {
    if (paginationData.before) {
      console.log("⬅️ [Client] Going to previous page with before token:", paginationData.before);
      setBefore(paginationData.before);
      setAfter("");
    }
  };

  const handleFilterChange = () => {
    console.log("🔄 [Client] Filters changed, resetting pagination");
    setAfter("");
    setBefore("");
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <ChevronsUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (!token && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2Icon className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p className="font-semibold mb-2">Authentication Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={getToken}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry Authentication
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            Sales Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track and analyze your sales performance
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Min Price
              </label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => {
                  setPriceMin(e.target.value);
                  handleFilterChange();
                }}
                placeholder="0"
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleFilterChange();
                }}
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  handleFilterChange();
                }}
                placeholder="+1234567890"
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Total Sales Over Time
          </h2>
          {salesLoading && totalSalesData.length === 0 ? (
            <div className="h-64 sm:h-80 flex items-center justify-center">
              <Loader2Icon className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : totalSalesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 250 : 320}>
              <LineChart data={totalSalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="day"
                  stroke="#6b7280"
                  style={{ fontSize: window.innerWidth < 640 ? "10px" : "12px" }}
                  angle={window.innerWidth < 640 ? -45 : 0}
                  textAnchor={window.innerWidth < 640 ? "end" : "middle"}
                  height={window.innerWidth < 640 ? 60 : 30}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: window.innerWidth < 640 ? "10px" : "12px" }}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                  width={window.innerWidth < 640 ? 50 : 60}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: window.innerWidth < 640 ? "12px" : "14px" }} />
                <Line
                  type="monotone"
                  dataKey="totalSale"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: window.innerWidth < 640 ? 3 : 4 }}
                  activeDot={{ r: window.innerWidth < 640 ? 5 : 6 }}
                  name="Total Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500 text-sm sm:text-base">
              No data available for the selected date range
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Sales Details</h2>
          </div>

          {salesLoading ? (
            <div className="h-64 sm:h-96 flex items-center justify-center">
              <Loader2Icon className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : salesData.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                {salesData.map((sale) => (
                  <div key={sale._id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(sale.price)}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(sale.date)}</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{sale.customerEmail}</div>
                    <div className="text-sm text-gray-600">{sale.customerPhone}</div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("date")}
                          className="flex items-center gap-2 hover:text-gray-700"
                        >
                          Date
                          <SortIcon column="date" />
                        </button>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("price")}
                          className="flex items-center gap-2 hover:text-gray-700"
                        >
                          Price
                          <SortIcon column="price" />
                        </button>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        Customer Email
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                        Phone Number
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesData.map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sale.date)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(sale.price)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sale.customerEmail}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sale.customerPhone}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {salesData.length} items per page
                  {(after || before) && (
                    <span className="ml-2 text-gray-400">
                      • {before ? "Previous page" : "Next page"}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={!paginationData.before}
                    className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!paginationData.after}
                    className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 sm:h-96 flex items-center justify-center text-gray-500 text-sm sm:text-base px-4">
              No sales data available for the current filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
