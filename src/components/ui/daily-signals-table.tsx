"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface DailySignal {
  id: string;
  pair: string;
  type: string;
  entryPrice: number;
  stopLoss: number;
  target: number;
  time: string;
  status: string;
  volume: number;
  profit: number;
  premium: string;
}

interface DailySignalsTableProps {
  signals: DailySignal[];
  loading: boolean;
  totalProfit: number;
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export function DailySignalsTable({
  signals,
  loading,
  totalProfit,
  onSort,
  sortField,
  sortDirection,
}: DailySignalsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { t, language } = useLanguage();

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatPrice = (price: number) => {
    return price.toFixed(price < 10 ? 5 : 2);
  };

  const formatProfit = (profit: number) => {
    const sign = profit >= 0 ? "+" : "";
    return `${sign}${profit.toFixed(2)}`;
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-400";
    if (profit < 0) return "text-red-400";
    return "text-gray-400";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "successful":
        return "text-green-400 bg-green-400/10";
      case "unsuccessful":
        return "text-red-400 bg-red-400/10";
      case "active":
        return "text-blue-400 bg-blue-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getTypeColor = (type: string) => {
    return type.toLowerCase() === "buy"
      ? "text-green-400 bg-green-400/10"
      : "text-red-400 bg-red-400/10";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-gray-400">
          {language === "fa" ? "در حال بارگذاری..." : "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 rounded-lg overflow-hidden border border-gray-600 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr
                  className={`${language === "fa" ? "text-right" : "text-left"}`}
                >
                  <th
                    className={`px-6 py-4 text-sm font-semibold text-gray-200 ${language === "fa" ? "text-right" : "text-left"}`}
                  >
                    {language === "fa" ? "جفت ارز" : "Pair"}
                  </th>
                  <th
                    className={`px-6 py-4 text-sm font-semibold text-gray-200 ${language === "fa" ? "text-right" : "text-left"}`}
                  >
                    {language === "fa" ? "نوع" : "Type"}
                  </th>
                  <th
                    className={`px-6 py-4 text-sm font-semibold text-gray-200 ${language === "fa" ? "text-right" : "text-left"}`}
                  >
                    {language === "fa" ? "قیمت ورود" : "Entry"}
                  </th>
                  <th
                    className={`px-6 py-4 text-sm font-semibold text-gray-200 ${language === "fa" ? "text-right" : "text-left"}`}
                  >
                    {language === "fa" ? "هدف" : "Target"}
                  </th>
                  <th
                    className={`px-6 py-4 text-sm font-semibold text-gray-200 ${language === "fa" ? "text-right" : "text-left"}`}
                  >
                    {language === "fa" ? "وضعیت" : "Status"}
                  </th>
                  <th
                    className={`px-6 py-4 text-sm font-semibold text-gray-200 ${language === "fa" ? "text-right" : "text-left"}`}
                  >
                    {language === "fa" ? "سود" : "Profit"}
                  </th>
                  <th
                    className={`px-6 py-4 text-sm font-semibold text-gray-200 ${language === "fa" ? "text-right" : "text-left"}`}
                  >
                    {language === "fa" ? "زمان" : "Time"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600/30">
                {signals.map((signal) => (
                  <React.Fragment key={signal.id}>
                    <tr
                      className="hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => toggleRowExpansion(signal.id)}
                    >
                      <td
                        className={`px-6 py-4 ${language === "fa" ? "text-right" : "text-left"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {signal.pair}
                          </span>
                          {signal.premium === "premium" && (
                            <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                              {language === "fa" ? "پریمیوم" : "Premium"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`px-6 py-4 ${language === "fa" ? "text-right" : "text-left"}`}
                      >
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(
                            signal.type
                          )}`}
                        >
                          {signal.type.toUpperCase()}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 text-white font-mono ${language === "fa" ? "text-right" : "text-left"}`}
                      >
                        {formatPrice(signal.entryPrice)}
                      </td>
                      <td
                        className={`px-6 py-4 text-white font-mono ${language === "fa" ? "text-right" : "text-left"}`}
                      >
                        {formatPrice(signal.target)}
                      </td>
                      <td
                        className={`px-6 py-4 ${language === "fa" ? "text-right" : "text-left"}`}
                      >
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            signal.status
                          )}`}
                        >
                          {language === "fa"
                            ? signal.status === "Successful"
                              ? "موفق"
                              : signal.status === "Unsuccessful"
                                ? "ناموفق"
                                : signal.status === "Active"
                                  ? "فعال"
                                  : signal.status
                            : signal.status}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 ${language === "fa" ? "text-right" : "text-left"}`}
                      >
                        <span
                          className={`font-bold font-mono ${getProfitColor(signal.profit)}`}
                        >
                          {formatProfit(signal.profit)}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 text-gray-300 text-sm ${language === "fa" ? "text-right" : "text-left"}`}
                      >
                        {formatTime(signal.time)}
                      </td>
                    </tr>
                    {expandedRows.has(signal.id) && (
                      <tr className="bg-gray-800/50">
                        <td colSpan={7} className="px-6 py-4">
                          <div
                            className={`grid grid-cols-2 md:grid-cols-3 gap-4 text-sm ${language === "fa" ? "text-right" : "text-left"}`}
                          >
                            <div>
                              <span className="text-gray-400">
                                {language === "fa" ? "حد ضرر:" : "Stop Loss:"}
                              </span>
                              <span className="text-white font-mono ml-2">
                                {formatPrice(signal.stopLoss)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                {language === "fa" ? "حجم:" : "Volume:"}
                              </span>
                              <span className="text-white font-mono ml-2">
                                {signal.volume}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">ID:</span>
                              <span className="text-white font-mono ml-2">
                                {signal.id}
                              </span>
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
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 rounded-lg p-4 border border-gray-600 shadow-lg"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-lg">
                    {signal.pair}
                  </span>
                  {signal.premium === "premium" && (
                    <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                      {language === "fa" ? "پریمیوم" : "Premium"}
                    </span>
                  )}
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(
                    signal.type
                  )}`}
                >
                  {signal.type.toUpperCase()}
                </span>
              </div>
              <div
                className={`text-right ${language === "fa" ? "text-left" : "text-right"}`}
              >
                <div className={`font-bold ${getProfitColor(signal.profit)}`}>
                  {formatProfit(signal.profit)}
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                    signal.status
                  )}`}
                >
                  {language === "fa"
                    ? signal.status === "Successful"
                      ? "موفق"
                      : signal.status === "Unsuccessful"
                        ? "ناموفق"
                        : signal.status === "Active"
                          ? "فعال"
                          : signal.status
                    : signal.status}
                </span>
              </div>
            </div>

            <div
              className={`grid grid-cols-2 gap-3 text-sm ${language === "fa" ? "text-right" : "text-left"}`}
            >
              <div>
                <span className="text-gray-400 block">
                  {language === "fa" ? "قیمت ورود:" : "Entry:"}
                </span>
                <span className="text-white font-mono">
                  {formatPrice(signal.entryPrice)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">
                  {language === "fa" ? "هدف:" : "Target:"}
                </span>
                <span className="text-white font-mono">
                  {formatPrice(signal.target)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">
                  {language === "fa" ? "حد ضرر:" : "Stop Loss:"}
                </span>
                <span className="text-white font-mono">
                  {formatPrice(signal.stopLoss)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">
                  {language === "fa" ? "حجم:" : "Volume:"}
                </span>
                <span className="text-white font-mono">{signal.volume}</span>
              </div>
            </div>

            <div
              className={`mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400 ${language === "fa" ? "text-right" : "text-left"}`}
            >
              {formatTime(signal.time)}
            </div>
          </div>
        ))}
      </div>

      {/* Total Profit Display */}
      {signals.length > 0 && (
        <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 rounded-lg p-6 border border-gray-600 shadow-lg">
          <div
            className={`text-center ${language === "fa" ? "text-right" : "text-center"}`}
          >
            <h3
              className={`text-lg font-semibold text-white mb-2 ${language === "fa" ? "text-right" : "text-center"}`}
            >
              {language === "fa" ? "سود کل روزانه" : "Total Daily Profit"}
            </h3>
            <div
              className={`text-3xl font-bold ${language === "fa" ? "text-right" : "text-center"}`}
            >
              <span className={`${getProfitColor(totalProfit)} font-mono`}>
                {formatProfit(totalProfit)}
              </span>
              <span className="text-gray-400 text-lg ml-2">USD</span>
            </div>
            <p
              className={`text-gray-400 text-sm mt-1 ${language === "fa" ? "text-right" : "text-center"}`}
            >
              {language === "fa"
                ? `از ${signals.length} سیگنال در روز جاری`
                : `From ${signals.length} signals today`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
