"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// Define types for monthly signal data
export interface MonthlySignal {
  id: string;
  pair: string;
  type: "buy" | "sell";
  entryPrice: number;
  stopLoss: number;
  target: number;
  time: string;
  status: "Successful" | "Unsuccessful";
  volume: number;
  profit: number;
  premium: "free" | "premium";
}

interface MonthlySignalsTableProps {
  signals: MonthlySignal[];
  loading: boolean;
  totalProfit: number;
  onSort?: (field: string, direction: "asc" | "desc") => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  summaryTitle?: string;
  summaryCountTextFa?: string; // e.g., "از X سیگنال در هفته جاری"
  summaryCountTextEn?: string; // e.g., "From X signals this week"
}

export function MonthlySignalsTable({
  signals,
  loading,
  totalProfit,
  onSort,
  sortField,
  sortDirection,
  summaryTitle,
  summaryCountTextFa,
  summaryCountTextEn,
}: MonthlySignalsTableProps) {
  const { t, language } = useLanguage();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (signalId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(signalId)) {
      newExpanded.delete(signalId);
    } else {
      newExpanded.add(signalId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: string) => {
    if (onSort) {
      const direction =
        sortField === field && sortDirection === "asc" ? "desc" : "asc";
      onSort(field, direction);
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(4);
  };

  const formatProfit = (profit: number) => {
    return profit.toFixed(2);
  };

  const formatTime = (timeStr: string) => {
    // Handle both database timestamp and display format
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        return timeStr; // Return as-is if not a valid date
      }
      return date.toLocaleString(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  const getStatusColor = (status: "Successful" | "Unsuccessful") => {
    return status === "Successful" ? "text-green-400" : "text-red-400";
  };

  const getStatusText = (status: "Successful" | "Unsuccessful") => {
    return status === "Successful"
      ? t("successful") || "موفق"
      : t("unsuccessful") || "ناموفق";
  };

  const getTypeColor = (type: "buy" | "sell") => {
    return type === "buy" ? "text-green-400" : "text-red-400";
  };

  const getTypeText = (type: "buy" | "sell") => {
    return type === "buy" ? t("buy") || "خرید" : t("sell") || "فروش";
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? "text-green-400" : "text-red-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Monthly Signals Table */}
      <div className="w-full overflow-x-auto shadow-2xl rounded-lg">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-1">
          <table className="w-full border-collapse rounded-lg overflow-hidden min-w-[1200px]">
            <thead>
              <tr className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 border-b border-gray-600">
                <th
                  className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                  onClick={() => handleSort("pair")}
                >
                  <div className="flex items-center justify-center gap-2">
                    {t("pair") || "pair"}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center justify-center gap-2">
                    {t("type") || "type"}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                  onClick={() => handleSort("entryPrice")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Entry Price
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  Stop Loss
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  Target
                </th>
                <th
                  className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                  onClick={() => handleSort("time")}
                >
                  <div className="flex items-center justify-center gap-2">
                    {t("time") || "time"}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t("status") || "status"}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t("volume") || "volume"}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t("profit") || "profit"}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  Premium
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t("details") || "details"}
                </th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal, index) => (
                <React.Fragment key={signal.id}>
                  <tr className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-all duration-200 hover:shadow-lg">
                    <td className="px-4 py-3 text-sm font-medium text-white text-center">
                      {signal.pair}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`font-medium ${getTypeColor(signal.type)}`}
                      >
                        {getTypeText(signal.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-mono text-center">
                      {formatPrice(signal.entryPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400 font-mono text-center">
                      {formatPrice(signal.stopLoss)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400 font-mono text-center">
                      {formatPrice(signal.target)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-center">
                      {formatTime(signal.time)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`font-medium ${getStatusColor(signal.status)}`}
                      >
                        {getStatusText(signal.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-mono text-center">
                      {signal.volume.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`font-mono font-medium ${getProfitColor(signal.profit)}`}
                      >
                        {formatProfit(signal.profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {signal.premium === "premium" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-400/30">
                          premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700/30 text-gray-400 border border-gray-600/30">
                          free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(signal.id)}
                        className="text-gray-400 hover:text-white p-1"
                      >
                        {expandedRows.has(signal.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  {expandedRows.has(signal.id) && (
                    <tr className="bg-gray-800/20 border-b border-gray-700/30">
                      <td colSpan={11} className="px-4 py-3">
                        <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg p-4 space-y-3 border border-gray-600/30 shadow-lg">
                          <h4 className="text-sm font-medium text-white mb-2">
                            {t("signalDetails") || "Signal Details"}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">ID:</span>
                              <span className="text-white ml-2 font-mono">
                                {signal.id}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Pair:</span>
                              <span className="text-white ml-2">
                                {signal.pair}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Type:</span>
                              <span
                                className={`ml-2 font-medium ${getTypeColor(signal.type)}`}
                              >
                                {getTypeText(signal.type)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Entry Price:
                              </span>
                              <span className="text-white ml-2 font-mono">
                                {formatPrice(signal.entryPrice)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Stop Loss:</span>
                              <span className="text-red-400 ml-2 font-mono">
                                {formatPrice(signal.stopLoss)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Target:</span>
                              <span className="text-green-400 ml-2 font-mono">
                                {formatPrice(signal.target)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Time:</span>
                              <span className="text-white ml-2">
                                {formatTime(signal.time)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <span
                                className={`ml-2 font-medium ${getStatusColor(signal.status)}`}
                              >
                                {getStatusText(signal.status)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Profit:</span>
                              <span
                                className={`ml-2 font-medium ${getProfitColor(signal.profit)}`}
                              >
                                {formatProfit(signal.profit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {signals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {t("noSignalsFound") || "No signals found"}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {t("tryDifferentPair") || "Try searching for a different pair"}
            </p>
          </div>
        )}
      </div>

      {/* Total Profit Display */}
      {signals.length > 0 && (
        <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 rounded-lg p-6 border border-gray-600 shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              {summaryTitle
                ? summaryTitle
                : language === "fa"
                  ? "سود کل ماهیانه"
                  : "Total Monthly Profit"}
            </h3>
            <div className="text-3xl font-bold">
              <span className={`${getProfitColor(totalProfit)} font-mono`}>
                {formatProfit(totalProfit)}
              </span>
              <span className="text-gray-400 text-lg ml-2">USD</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {language === "fa"
                ? summaryCountTextFa ||
                  `از ${signals.length} سیگنال در ماه جاری`
                : summaryCountTextEn ||
                  `From ${signals.length} signals this month`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
