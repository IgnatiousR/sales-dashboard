interface StatsCardsProps {
  totalSales: number;
  recordCount: number;
  dateRangeDays: number;
}

export default function StatsCards({ totalSales, recordCount, dateRangeDays }: StatsCardsProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
      <div className="bg-white rounded-md shadow p-4 md:p-6">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Sales</p>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          {formatCurrency(totalSales)}
        </p>
      </div>
      <div className="bg-white rounded-md shadow p-4 md:p-6">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sales Records</p>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{recordCount}</p>
      </div>
      <div className="bg-white rounded-md shadow p-4 md:p-6 sm:col-span-2 lg:col-span-1">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Date Range</p>
        <p className="text-base sm:text-lg font-semibold text-gray-900">{dateRangeDays} days</p>
      </div>
    </div>
  );
}
