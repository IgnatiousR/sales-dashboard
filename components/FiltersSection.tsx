import { RefreshCwIcon } from "lucide-react";

interface FiltersSectionProps {
  startDate: string;
  endDate: string;
  priceMin: string;
  email: string;
  phone: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  isDateRangeValid?: boolean;
}

export default function FiltersSection({
  startDate,
  endDate,
  priceMin,
  email,
  phone,
  onStartDateChange,
  onEndDateChange,
  onPriceMinChange,
  onEmailChange,
  onPhoneChange,
  onRefresh,
  loading = false, // ✅ ADD THIS with default value
  isDateRangeValid = true,
}: FiltersSectionProps) {
  const isDisabled = loading || !isDateRangeValid;
  return (
    <div className="bg-white rounded-md shadow p-4 md:p-6 mb-4 md:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">Filters</h2>
        <button
          onClick={onRefresh}
          disabled={isDisabled}
          className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 text-sm rounded-sm transition-colors ${
            isDisabled
              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
              : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          }`}
        >
          <RefreshCwIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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
            max={endDate}
            onChange={(e) => onStartDateChange(e.target.value)}
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
            min={startDate}
            onChange={(e) => onEndDateChange(e.target.value)}
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
            onChange={(e) => onPriceMinChange(e.target.value)}
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
            onChange={(e) => onEmailChange(e.target.value)}
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
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+1234567890"
            className="w-full px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
