"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
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
import { ChevronLeft, ChevronRight, ArrowUpDown, Loader2, RefreshCw } from "lucide-react";

// ============================================================================
// Types
// ============================================================================
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

interface SalesResponse {
  results: {
    TotalSales: TotalSale[];
    Sales: Sale[];
  };
  pagination: {
    before: string;
    after: string;
  };
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface Filters {
  startDate: string;
  endDate: string;
  priceMin: string;
  email: string;
  phone: string;
  sortBy: string;
  sortOrder: string;
  after?: string;
  before?: string;
}

// ============================================================================
// Cache Implementation
// ============================================================================
class Cache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private duration: number;

  constructor(durationMs: number = 60 * 60 * 1000) {
    this.duration = durationMs;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.duration) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// API Service
// ============================================================================
const API_BASE_URL = "https://autobizz-425913.uc.r.appspot.com";
const TOKEN_CACHE_KEY = "auth_token";
const tokenCache = new Cache<string>(60 * 60 * 1000); // 1 hour
const dataCache = new Cache<SalesResponse>(60 * 60 * 1000);

const getAuthToken = async (): Promise<string> => {
  // Check cache first
  const cachedToken = tokenCache.get(TOKEN_CACHE_KEY);
  if (cachedToken) {
    console.log("✅ Using cached token:", cachedToken);
    console.log("📋 Token type:", typeof cachedToken);
    console.log("📋 Token length:", cachedToken.length);
    return cachedToken;
  }

  console.log("🔄 Fetching new token from server...");
  const response = await fetch(`${API_BASE_URL}/getAuthorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenType: "frontEndTest" }),
  });

  if (!response.ok) throw new Error("Authorization failed");

  const data = await response.json();
  console.log("✅ New token received:", data.token);
  console.log("📋 Token type:", typeof data.token);
  console.log("📋 Token length:", data.token.length);
  console.log("⏰ Token cached for 1 hour");
  tokenCache.set(TOKEN_CACHE_KEY, data.token);
  return data.token;
};

const fetchSalesData = async (token: string, params: Partial<Filters>): Promise<SalesResponse> => {
  const searchParams = new URLSearchParams();

  // Always include required params (even if empty)
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, value || "");
  });

  const url = `${API_BASE_URL}/sales?${searchParams}`;
  console.log("🔍 Fetching:", url);
  console.log("🔑 Using token:", token);

  const response = await fetch(url, {
    headers: {
      "X-AUTOBIZZ-TOKEN": token,
      "Content-Type": "application/json",
    },
  });

  console.log("📡 Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Error response:", errorText);
    throw new Error(`Failed to fetch sales data: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log("✅ Data received:", {
    totalSales: data.results?.TotalSales?.length || 0,
    sales: data.results?.Sales?.length || 0,
    hasBefore: !!data.pagination?.before,
    hasAfter: !!data.pagination?.after,
    beforeToken: data.pagination?.before || "none",
    afterToken: data.pagination?.after || "none",
  });

  return data;
};

// ============================================================================
// Utility Functions
// ============================================================================
const getCacheKey = (filters: Partial<Filters>): string => JSON.stringify(filters);

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ============================================================================
// Main Component
// ============================================================================
export default function SalesDashboard() {
  // State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [totalSalesData, setTotalSalesData] = useState<TotalSale[]>([]);
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters - January 2025
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-01-31");
  const [priceMin, setPriceMin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Pagination
  const [beforeToken, setBeforeToken] = useState("");
  const [afterToken, setAfterToken] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");

  // ============================================================================
  // Effects
  // ============================================================================

  // Get authorization token on mount
  useEffect(() => {
    const authorize = async () => {
      try {
        console.log("🔐 Initializing authorization...");
        const token = await getAuthToken();
        console.log("✅ Authorization successful. Token:", token);
        setAuthToken(token);
      } catch (err) {
        setError("Failed to authorize. Please refresh the page.");
        console.error("❌ Auth error:", err);
      }
    };
    authorize();
  }, []);

  // ============================================================================
  // Fetch Sales Data
  // ============================================================================

  const fetchSales = useCallback(
    async (direction: "next" | "prev" | null = null) => {
      if (!authToken) {
        console.log("⚠️ No auth token available yet");
        return;
      }

      setLoading(true);
      setError(null);

      const filters: Partial<Filters> = {
        startDate,
        endDate,
        priceMin,
        email,
        phone,
        sortBy,
        sortOrder,
        ...(direction === "next" && afterToken ? { after: afterToken } : {}),
        ...(direction === "prev" && beforeToken ? { before: beforeToken } : {}),
      };

      const cacheKey = getCacheKey(filters);
      const cached = dataCache.get(cacheKey);

      if (cached) {
        console.log("📦 Loading from cache");
        console.log("📊 Cached data:", {
          totalSalesDays: cached.results?.TotalSales?.length || 0,
          salesRecords: cached.results?.Sales?.length || 0,
          hasBefore: !!cached.pagination?.before,
          hasAfter: !!cached.pagination?.after,
        });
        setTotalSalesData(cached.results?.TotalSales || []);
        setSalesData(cached.results?.Sales || []);
        setBeforeToken(cached.pagination?.before || "");
        setAfterToken(cached.pagination?.after || "");
        setLoading(false);
        return;
      }

      try {
        console.log("🔄 Fetching sales data with filters:", {
          startDate,
          endDate,
          priceMin,
          email,
          phone,
          sortBy,
          sortOrder,
          direction,
          paginationToken:
            direction === "next" ? afterToken : direction === "prev" ? beforeToken : "none",
        });

        const data = await fetchSalesData(authToken, filters);

        // Validate response structure
        if (!data || !data.results) {
          console.error("❌ Invalid response structure:", data);
          throw new Error("Invalid response from server");
        }

        const totalSales = data.results.TotalSales || [];
        const sales = data.results.Sales || [];
        const beforePagination = data.pagination?.before || "";
        const afterPagination = data.pagination?.after || "";

        console.log("📊 Setting data:", {
          totalSalesDays: totalSales.length,
          salesRecords: sales.length,
          beforeToken: beforePagination ? "present" : "none",
          afterToken: afterPagination ? "present" : "none",
        });

        setTotalSalesData(totalSales);
        setSalesData(sales);
        setBeforeToken(beforePagination);
        setAfterToken(afterPagination);

        // Cache the data
        dataCache.set(cacheKey, data);
        console.log("💾 Data cached successfully");

        // Log if no results found
        if (totalSales.length === 0 && sales.length === 0) {
          console.log("ℹ️ No results found for current filters");
        }
      } catch (err) {
        setError("Failed to load sales data. Please try again.");
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      authToken,
      startDate,
      endDate,
      priceMin,
      email,
      phone,
      sortBy,
      sortOrder,
      afterToken,
      beforeToken,
    ]
  );

  // Initial load and filter changes
  useEffect(() => {
    if (authToken) {
      console.log("🔄 Filter or sort changed, resetting pagination and fetching data");
      setCurrentPage(1);
      setBeforeToken("");
      setAfterToken("");
      fetchSales();
    }
  }, [authToken, startDate, endDate, priceMin, email, phone, sortBy, sortOrder, fetchSales]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSort = useCallback((field: "date" | "price") => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortOrder("asc");
      return field;
    });
    setCurrentPage(1);
  }, []);

  const handleNext = useCallback(() => {
    if (afterToken) {
      console.log("➡️ Moving to next page, using after token:", afterToken);
      setCurrentPage((p) => p + 1);
      fetchSales("next");
    } else {
      console.log("⚠️ No next page available");
    }
  }, [afterToken, fetchSales]);

  const handlePrevious = useCallback(() => {
    if (beforeToken && currentPage > 1) {
      console.log("⬅️ Moving to previous page, using before token:", beforeToken);
      setCurrentPage((p) => p - 1);
      fetchSales("prev");
    } else {
      console.log("⚠️ No previous page available or already on first page");
    }
  }, [beforeToken, currentPage, fetchSales]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const chartData = useMemo(
    () => totalSalesData.map((item) => ({ date: item.day, total: item.totalSale })),
    [totalSalesData]
  );

  const totalSalesSum = useMemo(
    () => totalSalesData.reduce((sum, item) => sum + item.totalSale, 0),
    [totalSalesData]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Sales Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Monitor and analyze your sales performance
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white rounded-md shadow p-4 md:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Sales</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {formatCurrency(totalSalesSum)}
            </p>
          </div>
          <div className="bg-white rounded-md shadow p-4 md:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sales Records</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {salesData.length}
            </p>
          </div>
          <div className="bg-white rounded-md shadow p-4 md:p-6 sm:col-span-2 lg:col-span-1">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Date Range</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {totalSalesData.length} days
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-md shadow p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Filters</h2>
            <button
              onClick={() => fetchSales()}
              className="flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Minimum Price
              </label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-md shadow p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Total Sales Over Time
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300} className="sm:hidden">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  stroke="#6b7280"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="#6b7280"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Total Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] sm:hidden flex items-center justify-center text-gray-500 text-sm">
              No data available for the selected date range
            </div>
          )}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350} className="hidden sm:block">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Total Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] hidden sm:flex items-center justify-center text-gray-500">
              No data available for the selected date range
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-md shadow overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Sales Transactions</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Showing up to 50 records per page
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 md:p-12">
              <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-blue-500 mb-3" />
              <p className="text-sm md:text-base text-gray-600">Loading sales data...</p>
            </div>
          ) : salesData.length === 0 ? (
            <div className="p-8 md:p-12 text-center text-gray-500">
              <p className="text-base md:text-lg font-medium mb-2">No sales found</p>
              <p className="text-xs sm:text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-gray-200">
                {salesData.map((sale) => (
                  <div key={sale._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(sale.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Price</p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(sale.price)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-700 break-all">{sale.customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm text-gray-700">{sale.customerPhone}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("date")}
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                        >
                          Date
                          <ArrowUpDown
                            className={`w-4 h-4 ${sortBy === "date" ? "text-blue-600" : ""}`}
                          />
                        </button>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Email
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("price")}
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                        >
                          Price
                          <ArrowUpDown
                            className={`w-4 h-4 ${sortBy === "price" ? "text-blue-600" : ""}`}
                          />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesData.map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sale.date)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sale.customerEmail}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sale.customerPhone}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(sale.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50">
                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                  <span className="font-medium">Page {currentPage}</span>
                  <span className="text-gray-500 ml-2">• {salesData.length} records</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handlePrevious}
                    disabled={!beforeToken || currentPage === 1}
                    className="flex-1 sm:flex-none px-3 md:px-4 py-2 border border-gray-300 rounded-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!afterToken}
                    className="flex-1 sm:flex-none px-3 md:px-4 py-2 border border-gray-300 rounded-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
