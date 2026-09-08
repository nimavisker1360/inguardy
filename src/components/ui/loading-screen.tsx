"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/language-context";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const { language } = useLanguage();

  useEffect(() => {
    // Complete loading after 2 seconds
    const timer = setTimeout(() => {
      onLoadingComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="text-center">
        {/* Simple Loading Spinner */}
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>

        {/* Simple Text */}
        <h1
          className={`text-2xl font-bold text-white mb-2 ${language === "fa" ? "font-[IRANSans]" : ""}`}
        >
          {language === "fa" ? "تریدیویکس" : "Tradivix"}
        </h1>

        <p
          className={`text-gray-400 ${language === "fa" ? "font-[IRANSans]" : ""}`}
        >
          {language === "fa" ? "در حال بارگذاری..." : "Loading..."}
        </p>
      </div>
    </div>
  );
}
