"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, User, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

// NewsAPI news item interface
interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  publishTime: string;
  url: string;
  imageUrl?: string | null;
}

export default function NewsDetailPage() {
  const params = useParams();
  const newsId = params.id as string;
  const { t } = useLanguage();
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all news from our API endpoint
        const response = await fetch("/api/news-api");

        if (!response.ok) {
          throw new Error("blogPage.loadError");
        }

        const data = await response.json();
        const news = Array.isArray(data.news) ? data.news : [];

        // Find the specific news item by ID
        const item = news.find((item: NewsItem) => item.id === newsId);

        if (!item) {
          throw new Error("blogPage.notFound");
        }

        setNewsItem(item);
        setLoading(false);
      } catch {
        setError("blogPage.detailLoadError");
        setLoading(false);
      }
    };

    if (newsId) {
      fetchNewsDetail();
    }
  }, [newsId]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return translate("blogPage.recent", "Recent");
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-black text-white pt-20 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />{" "}
            {translate("blogPage.backToNews", "Back to all news")}
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-8 border border-red-700 rounded-lg bg-red-900/20">
            {translate(
              error,
              "Failed to fetch news details. Please try again later."
            )}
          </div>
        ) : newsItem ? (
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 max-w-4xl mx-auto text-left">
            <div className="relative h-64 md:h-96 w-full">
              <NewsImage
                src={newsItem.imageUrl}
                alt={newsItem.title}
                fallbackLabel={translate("blogPage.financialNews", "Financial News")}
              />
            </div>

            <div className="p-6 md:p-10">
              <div className="flex items-center text-sm text-gray-400 mb-4">
                <Calendar size={14} className="mr-1" />
                <span>{formatDate(newsItem.publishTime)}</span>
                <span className="mx-2">•</span>
                <User size={14} className="mr-1" />
                <span>{newsItem.source}</span>
              </div>

              <h1 className="text-2xl md:text-4xl font-bold mb-6">
                {newsItem.title}
              </h1>

              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 text-lg mb-8">
                  {newsItem.description}
                </p>

                <div className="bg-gray-800/50 p-6 rounded-lg flex flex-col md:flex-row items-center justify-between">
                  <p className="text-gray-300 mb-4 md:mb-0">
                    {translate(
                      "blogPage.originalSourceText",
                      "Read the full article on the original source:"
                    )}
                  </p>
                  <Link
                    href={newsItem.url}
                    className="inline-flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {translate("blogPage.visitSource", "Visit Source")}{" "}
                    <LinkIcon size={16} className="ml-2" />
                  </Link>
                </div>

                <div className="mt-10 border-t border-gray-800 pt-6">
                  <h3 className="text-xl font-bold mb-4">
                    {translate("blogPage.disclaimer", "Disclaimer")}
                  </h3>
                  <p className="text-gray-400">
                    {translate(
                      "blogPage.disclaimerText",
                      "The information provided in this article is for informational purposes only and should not be considered as financial advice. Always conduct your own research before making any investment decisions."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-xl text-gray-400">
              {translate("blogPage.notFound", "News article not found")}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function NewsImage({
  src,
  alt,
  fallbackLabel,
}: {
  src?: string | null;
  alt: string;
  fallbackLabel: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-600 to-teal-600">
        <span className="text-2xl font-bold">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="absolute h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
