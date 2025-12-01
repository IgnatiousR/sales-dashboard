"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { CacheItem, Filters, Sale, SalesResponse, TotalSale } from "@/types";
import StatsCards from "./StatsCards";
import FiltersSection from "./FilterSection";
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
  const cachedToken = tokenCache.get(TOKEN_CACHE_KEY);
  if (cachedToken) return cachedToken;

  const response = await fetch(`${API_BASE_URL}/getAuthorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenType: "frontEndTest" }),
  });

  if (!response.ok) throw new Error("Authorization failed");

  const data = await response.json();
  tokenCache.set(TOKEN_CACHE_KEY, data.token);
  return data.token;
};

const fetchSalesData = async (token: string, params: Partial<Filters>): Promise<SalesResponse> => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, value || "");
  });

  const response = await fetch(`${API_BASE_URL}/sales?${searchParams}`, {
    headers: {
      "X-AUTOBIZZ-TOKEN": token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sales data: ${response.status}`);
  }

  return response.json();
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

  // Get authorization token on mount
  useEffect(() => {
    const authorize = async () => {
      try {
        const token = await getAuthToken();
        setAuthToken(token);
      } catch (err) {
        setError("Failed to authorize. Please refresh the page.");
        console.error("Auth error:", err);
      }
    };
    authorize();
  }, []);

  // Fetch Sales Data
  const fetchSales = useCallback(
    async (direction: "next" | "prev" | null = null) => {
      if (!authToken) return;

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
        setTotalSalesData(cached.results?.TotalSales || []);
        setSalesData(cached.results?.Sales || []);
        setBeforeToken(cached.pagination?.before || "");
        setAfterToken(cached.pagination?.after || "");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchSalesData(authToken, filters);

        if (!data || !data.results) {
          throw new Error("Invalid response from server");
        }

        const totalSales = data.results.TotalSales || [];
        const sales = data.results.Sales || [];
        const beforePagination = data.pagination?.before || "";
        const afterPagination = data.pagination?.after || "";

        setTotalSalesData(totalSales);
        setSalesData(sales);
        setBeforeToken(beforePagination);
        setAfterToken(afterPagination);

        dataCache.set(cacheKey, data);
      } catch (err) {
        setError("Failed to load sales data. Please try again.");
        console.error("Fetch error:", err);
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
      setCurrentPage((p) => p + 1);
      fetchSales("next");
    }
  }, [afterToken, fetchSales]);

  const handlePrevious = useCallback(() => {
    if (beforeToken && currentPage > 1) {
      setCurrentPage((p) => p - 1);
      fetchSales("prev");
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
