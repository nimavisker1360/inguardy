"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// Define types for signal data
interface Signal {
  id: string;
  pair: string;
  type: "buy" | "sell";
  price: number;
  takeProfit: number[];
  stopLoss: number;
  timestamp: string;
  success?: boolean;
  isPremium: boolean;
  profit?: number;
  volume?: number;
}

interface SignalsTableProps {
  signals: Signal[];
  loading: boolean;
  onSort?: (field: string, direction: "asc" | "desc") => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export function SignalsTable({
  signals,
  loading,
  onSort,
  sortField,
  sortDirection,
}: SignalsTableProps) {
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

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return timestamp;
      }
      return date.toLocaleString(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const getStatusColor = (success?: boolean) => {
    if (success === true) return "text-green-400";
    if (success === false) return "text-red-400";
    return "text-yellow-400";
  };

  const getStatusText = (success?: boolean) => {
    if (success === true) return t("successful") || "موفق";
    if (success === false) return t("unsuccessful") || "ناموفق";
    return t("open") || "باز";
  };

  const getTypeColor = (type: "buy" | "sell") => {
    return type === "buy" ? "text-green-400" : "text-red-400";
  };

  const getTypeText = (type: "buy" | "sell") => {
    return type === "buy" ? t("buy") || "خرید" : t("sell") || "فروش";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto shadow-2xl rounded-lg">
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-1">
        <table className="w-full border-collapse rounded-lg overflow-hidden min-w-[800px]">
          <thead>
            <tr className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 border-b border-gray-600">
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                #
              </th>
              <th
                className="px-4 py-3 text-right text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                onClick={() => handleSort("pair")}
              >
                <div className="flex items-center gap-2">
                  {t("pair") || "جفت ارز"}
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                onClick={() => handleSort("type")}
              >
                <div className="flex items-center gap-2">
                  {t("type") || "نوع"}
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                onClick={() => handleSort("price")}
              >
                <div className="flex items-center gap-2">
                  {t("entryPrice") || "قیمت ورود"}
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                {t("stopLoss") || "حد ضرر"}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                {t("target") || "اهداف"}
              </th>
              <th
                className="px-4 py-3 text-right text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors hover:bg-gray-700/50 rounded"
                onClick={() => handleSort("timestamp")}
              >
                <div className="flex items-center gap-2">
                  {t("time") || "زمان"}
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                {t("status") || "وضعیت"}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                {t("volume") || "حجم"}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                {t("profit") || "سود/ضرر"}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                {t("premium") || "پریمیوم"}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                {t("details") || "جزئیات"}
              </th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal, index) => (
              <React.Fragment key={signal.id}>
                <tr className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-all duration-200 hover:shadow-lg">
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {signal.pair}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`font-medium ${getTypeColor(signal.type)}`}
                    >
                      {getTypeText(signal.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-mono">
                    {formatPrice(signal.price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-400 font-mono">
                    {formatPrice(signal.stopLoss)}
                  </td>
                  <td className="px-4 py-3 text-sm text-green-400 font-mono">
                    {signal.takeProfit.length > 0
                      ? signal.takeProfit
                          .map((tp) => formatPrice(tp))
                          .join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatTimestamp(signal.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`font-medium ${getStatusColor(signal.success)}`}
                    >
                      {getStatusText(signal.success)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-mono">
                    {signal.volume ? signal.volume.toFixed(2) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`font-mono font-medium ${
                        (signal.profit ?? 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {(signal.profit ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {signal.isPremium ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-400/30">
                        {t("premium") || "پریمیوم"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700/30 text-gray-400 border border-gray-600/30">
                        {t("free") || "رایگان"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
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
                    <td colSpan={12} className="px-4 py-3">
                      <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg p-4 space-y-3 border border-gray-600/30 shadow-lg">
                        <h4 className="text-sm font-medium text-white mb-2">
                          {t("signalDetails") || "جزئیات سیگنال"}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">
                              {t("signalId") || "شناسه سیگنال"}:
                            </span>
                            <span className="text-white ml-2 font-mono">
                              {signal.id}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("pair") || "جفت ارز"}:
                            </span>
                            <span className="text-white ml-2">
                              {signal.pair}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("type") || "نوع"}:
                            </span>
                            <span
                              className={`ml-2 font-medium ${getTypeColor(signal.type)}`}
                            >
                              {getTypeText(signal.type)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("entryPrice") || "قیمت ورود"}:
                            </span>
                            <span className="text-white ml-2 font-mono">
                              {formatPrice(signal.price)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("stopLoss") || "حد ضرر"}:
                            </span>
                            <span className="text-red-400 ml-2 font-mono">
                              {formatPrice(signal.stopLoss)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("takeProfitTargets") || "اهداف سود"}:
                            </span>
                            <div className="ml-2 space-y-1">
                              {signal.takeProfit.map((tp, idx) => (
                                <div
                                  key={idx}
                                  className="text-green-400 font-mono"
                                >
                                  TP{idx + 1}: {formatPrice(tp)}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("timestamp") || "زمان ایجاد"}:
                            </span>
                            <span className="text-white ml-2">
                              {formatTimestamp(signal.timestamp)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("status") || "وضعیت"}:
                            </span>
                            <span
                              className={`ml-2 font-medium ${getStatusColor(signal.success)}`}
                            >
                              {getStatusText(signal.success)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t("premium") || "پریمیوم"}:
                            </span>
                            <span
                              className={`ml-2 ${signal.isPremium ? "text-yellow-400" : "text-gray-400"}`}
                            >
                              {signal.isPremium
                                ? t("yes") || "بله"
                                : t("no") || "خیر"}
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
            {t("noSignalsFound") || "هیچ سیگنالی یافت نشد"}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {t("tryDifferentPair") || "جفت ارز دیگری را جستجو کنید"}
          </p>
        </div>
      )}
    </div>
  );
}
