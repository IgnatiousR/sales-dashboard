"use client";
import { ArrowUpDownIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { Sale } from "@/types";

interface SalesTableProps {
  sales: Sale[];
  loading: boolean;
  sortBy: string;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onSort: (field: "date" | "price") => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export default function SalesTable({
  sales,
  loading,
  sortBy,
  currentPage,
  hasNextPage,
  hasPreviousPage,
  onSort,
  onNextPage,
  onPreviousPage,
}: SalesTableProps) {
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

  return (
    <div className="bg-white rounded-md shadow overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">Sales Transactions</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Showing up to 50 records per page</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 md:p-12">
          <Loader2Icon className="w-8 h-8 md:w-10 md:h-10 animate-spin text-blue-500 mb-3" />
          <p className="text-sm md:text-base text-gray-600">Loading sales data...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="p-8 md:p-12 text-center text-gray-500">
          <p className="text-base md:text-lg font-medium mb-2">No sales found</p>
          <p className="text-xs sm:text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-gray-200">
            {sales.map((sale) => (
              <div key={sale._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(sale.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Price</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(sale.price)}</p>
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
                      onClick={() => onSort("date")}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Date
                      <ArrowUpDownIcon
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
                      onClick={() => onSort("price")}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Price
                      <ArrowUpDownIcon
                        className={`w-4 h-4 ${sortBy === "price" ? "text-blue-600" : ""}`}
                      />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
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
              <span className="text-gray-500 ml-2">• {sales.length} records</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={onPreviousPage}
                disabled={!hasPreviousPage}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 border border-gray-300 rounded-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center justify-center gap-2 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>
              <button
                onClick={onNextPage}
                disabled={!hasNextPage}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 border border-gray-300 rounded-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center justify-center gap-2 transition-colors"
              >
                <span>Next</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
