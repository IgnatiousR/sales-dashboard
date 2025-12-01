"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { CacheItem, Filters, Sale, SalesResponse, TotalSale } from "@/types";
import StatsCards from "./StatsCards";
import FiltersSection from "./FiltersSection";
import SalesChart from "./SalesChart";
import SalesTable from "./SalesTable";

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
const tokenCache = new Cache<string>(60 * 60 * 1000);
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

const getCacheKey = (filters: Partial<Filters>): string => JSON.stringify(filters);

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

  // Filters
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

  const isDateRangeValid = useMemo(() => {
    return !startDate || !endDate || startDate <= endDate;
  }, [startDate, endDate]);

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

  // Fetch Sales Data
  const fetchSales = useCallback(
    async (direction: "next" | "prev" | null = null) => {
      if (!authToken) {
        console.log("⚠️ No auth token available yet");
        return;
      }

      if (!isDateRangeValid) {
        setError(
          "Please select a valid date range (start date must be before or equal to end date)"
        );
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
      isDateRangeValid,
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

  // Handlers
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

  // Computed Values
  const chartData = useMemo(
    () => totalSalesData.map((item) => ({ date: item.day, total: item.totalSale })),
    [totalSalesData]
  );

  const totalSalesSum = useMemo(
    () => totalSalesData.reduce((sum, item) => sum + item.totalSale, 0),
    [totalSalesData]
  );

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
        <StatsCards
          totalSales={totalSalesSum}
          recordCount={salesData.length}
          dateRangeDays={totalSalesData.length}
        />

        {/* Filters Section */}
        <FiltersSection
          startDate={startDate}
          endDate={endDate}
          priceMin={priceMin}
          email={email}
          phone={phone}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onPriceMinChange={setPriceMin}
          onEmailChange={setEmail}
          onPhoneChange={setPhone}
          onRefresh={() => fetchSales()}
          isDateRangeValid={isDateRangeValid}
          loading={loading}
        />

        {/* Chart Section */}
        <SalesChart data={chartData} />

        {/* Table Section */}
        <SalesTable
          sales={salesData}
          loading={loading}
          sortBy={sortBy}
          currentPage={currentPage}
          hasNextPage={!!afterToken}
          hasPreviousPage={!!beforeToken && currentPage > 1}
          onSort={handleSort}
          onNextPage={handleNext}
          onPreviousPage={handlePrevious}
        />
      </div>
    </div>
  );
}
