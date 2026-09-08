import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button showing current language */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 flex items-center gap-2 border-gray-700 hover:border-gray-600"
      >
        {language === "en" ? (
          <>
            <div className="w-6 h-4 relative overflow-hidden rounded-sm flex-shrink-0">
              <Image
                src="/images/flags/usa-flag.svg"
                alt="American Flag"
                width={24}
                height={16}
              />
            </div>
            <span>EN</span>
          </>
        ) : (
          <>
            <div className="w-6 h-4 relative overflow-hidden rounded-sm flex-shrink-0">
              <Image
                src="/images/flags/iran-flag.svg"
                alt="Iranian Flag"
                width={24}
                height={16}
              />
            </div>
            <span className="text-xs">فارسی</span>
          </>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute mt-1 w-auto min-w-[120px] bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* English Option */}
            <button
              onClick={() => {
                setLanguage("en");
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 w-full text-left text-sm ${
                language === "en" ? "bg-blue-600/20" : "hover:bg-gray-800"
              }`}
            >
              <div className="w-6 h-4 relative overflow-hidden rounded-sm flex-shrink-0">
                <Image
                  src="/images/flags/usa-flag.svg"
                  alt="American Flag"
                  width={24}
                  height={16}
                />
              </div>
              <span className="text-white">English</span>
            </button>

            {/* Farsi Option */}
            <button
              onClick={() => {
                setLanguage("fa");
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 w-full text-left text-sm ${
                language === "fa" ? "bg-blue-600/20" : "hover:bg-gray-800"
              }`}
            >
              <div className="w-6 h-4 relative overflow-hidden rounded-sm flex-shrink-0">
                <Image
                  src="/images/flags/iran-flag.svg"
                  alt="Iranian Flag"
                  width={24}
                  height={16}
                />
              </div>
              <span className="text-white">فارسی</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
