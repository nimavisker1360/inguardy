import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Define types for NewsAPI response
interface NewsAPISource {
  id: string | null;
  name: string;
}

interface NewsAPIArticle {
  source: NewsAPISource;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  code?: string;
  message?: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

type BlogNewsItem = {
  id: string;
  title: string;
  description: string;
  source: string;
  publishTime: string;
  url: string;
  imageUrl: string | null;
};

function createNewsId(url: string, publishedAt: string) {
  return encodeURIComponent(`${url}-${publishedAt}`)
    .replace(/%/g, "")
    .slice(0, 96);
}

function toNewsItem(article: NewsAPIArticle): BlogNewsItem | null {
  const title = article.title?.trim();
  const url = article.url?.trim();

  if (!title || !url || title === "[Removed]" || url.includes("removed.com")) {
    return null;
  }

  return {
    id: createNewsId(url, article.publishedAt),
    title,
    description:
      article.description?.trim() ||
      article.content?.replace(/\s*\[\+\d+ chars\]\s*$/, "").trim() ||
      "Read the full market update from the original source.",
    source: article.source?.name || "Market news",
    publishTime: article.publishedAt,
    url,
    imageUrl: article.urlToImage,
  };
}

function fallbackNews(): BlogNewsItem[] {
  return [
    {
      id: "market-risk-update",
      title: "Market risk update for forex and gold traders",
      description:
        "Review upcoming market drivers, volatility risk, and trade planning before entering new positions.",
      source: "Tradivix",
      publishTime: new Date().toISOString(),
      url: "https://tradivix.com/blog",
      imageUrl:
        "https://images.unsplash.com/photo-1611324586758-17c1192ef510?q=80&w=1000&auto=format&fit=crop",
    },
    {
      id: "eur-usd-session-watch",
      title: "EUR/USD session watch and risk management notes",
      description:
        "Track session volatility, important levels, and position sizing discipline before trading major pairs.",
      source: "Tradivix",
      publishTime: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      url: "https://tradivix.com/blog",
      imageUrl:
        "https://images.unsplash.com/photo-1627163439134-7a8c47e08208?q=80&w=1000&auto=format&fit=crop",
    },
    {
      id: "gold-trading-volatility",
      title: "Gold trading volatility checklist",
      description:
        "Use a simple checklist to avoid chasing moves around high-impact news and fast gold market swings.",
      source: "Tradivix",
      publishTime: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      url: "https://tradivix.com/blog",
      imageUrl:
        "https://images.unsplash.com/photo-1605231081543-2c22858eeaf3?q=80&w=1000&auto=format&fit=crop",
    },
  ];
}

// Using NewsAPI.org to fetch financial news
export async function GET() {
  try {
    const API_KEY = process.env.NEWS_API_KEY;

    if (!API_KEY) {
      throw new Error("NEWS_API_KEY is not defined in environment variables");
    }

    const params = new URLSearchParams({
      q: "(forex OR currency OR XAUUSD OR gold OR central bank OR inflation)",
      language: "en",
      sortBy: "publishedAt",
      pageSize: "20",
      apiKey: API_KEY,
    });

    const response = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`News API responded with status: ${response.status}`);
    }

    const data = (await response.json()) as NewsAPIResponse;

    if (data.status !== "ok") {
      throw new Error(data.message || data.code || "News API request failed");
    }

    // Transform the response to match our expected format.
    const news = data.articles
      .map(toNewsItem)
      .filter((item): item is BlogNewsItem => Boolean(item));

    return NextResponse.json(
      { news: news.length > 0 ? news : fallbackNews() },
      { status: 200 }
    );
  } catch {

    return NextResponse.json({ news: fallbackNews() }, { status: 200 });
  }
}
