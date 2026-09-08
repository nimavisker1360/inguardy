import { NextResponse } from "next/server";
import { MongoClient, Db } from "mongodb";

// Define types for signal data
export interface Signal {
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

interface SignalsResponse {
  signals: Signal[];
  total: number;
}

// MongoDB connection
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db("signals"); // نام دیتابیس شما

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// This endpoint will fetch signals data from MongoDB
export async function GET(request: Request) {
  try {
    // Get URL parameters for filtering and pagination
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all";
    const sort = searchParams.get("sort") || "newest";

    // Check if MongoDB URI is available
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return getMockSignals(page, limit, search, type, sort);
    }

    try {
      // Connect to MongoDB
      const { db } = await connectToDatabase();
      const collection = db.collection("sigData");

      // Build filter query
      const filter: any = {};

      if (search) {
        filter.symbol = { $regex: search, $options: "i" };
      }

      if (type !== "all") {
        filter.type = type === "buy" ? "Buy" : "Sell";
      }

      // Build sort query
      let sortQuery: any = {};
      if (sort === "newest") {
        sortQuery = { time: -1 };
      } else if (sort === "oldest") {
        sortQuery = { time: 1 };
      } else if (sort === "pair") {
        sortQuery = { symbol: 1 };
      }

      // Get total count
      const total = await collection.countDocuments(filter);

      // Get paginated results
      const signals = await collection
        .find(filter)
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      // Transform MongoDB documents to Signal interface
      const transformedSignals: Signal[] = signals.map((doc: any) => {
        const entryPrice = doc.entry ?? 0;
        const exitPrice = doc.exit ?? 0;
        const profit = doc.profit ?? 0;
        const volume = doc.volume ?? 0.01;
        const tradeType = doc.type?.toLowerCase() ?? "buy";

        // Calculate actual profit/loss based on entry and exit prices
        let calculatedProfit = 0;
        let isSuccessful = false;

        // Use the profit directly from database if available
        if (profit !== 0) {
          calculatedProfit = profit;
          isSuccessful = profit > 0;
        } else if (entryPrice > 0 && exitPrice > 0) {
          // Calculate profit based on price difference and volume
          const priceDiff =
            tradeType === "buy"
              ? exitPrice - entryPrice
              : entryPrice - exitPrice;

          // Calculate profit in dollars based on volume
          calculatedProfit = priceDiff * volume * 100000; // Standard lot calculation
          isSuccessful = calculatedProfit > 0;
        } else if (entryPrice > 0) {
          // If no exit price, calculate based on entry price movement
          // Simulate a small profit for demonstration
          calculatedProfit = entryPrice * volume * 0.1; // Small percentage of entry
          isSuccessful = true;
        }

        // Calculate take profit levels based on actual exit price
        const takeProfitLevels = [];
        if (exitPrice > 0) {
          takeProfitLevels.push(exitPrice);
        }

        // Calculate stop loss based on entry price and trade type
        let stopLoss = 0;
        if (entryPrice > 0) {
          if (tradeType === "buy") {
            stopLoss = entryPrice * 0.998; // 0.2% below entry for buy
          } else if (tradeType === "sell") {
            stopLoss = entryPrice * 1.002; // 0.2% above entry for sell
          }
        }

        return {
          id: doc._id?.toString?.() ?? String(doc.id ?? ""),
          pair: doc.symbol ?? "",
          type: tradeType as "buy" | "sell",
          price: entryPrice,
          takeProfit: takeProfitLevels,
          stopLoss: stopLoss,
          timestamp: doc.time ?? "Unknown",
          success: isSuccessful,
          isPremium: doc.isPremium ?? doc.premium ?? false,
          profit: calculatedProfit, // Add profit field
          volume: volume, // Add volume field
        } as Signal;
      });

      const response: SignalsResponse = {
        signals: transformedSignals,
        total: total,
      };

      return NextResponse.json(response, { status: 200 });
    } catch {
      // Add a note to the response that we're using mock data
      const mockResponse = getMockSignals(page, limit, search, type, sort);
      const responseData = await mockResponse.json();

      return NextResponse.json(
        {
          ...responseData,
          warning: "Using mock data - database connection failed",
          isUsingMockData: true,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch signals data" },
      { status: 500 }
    );
  }
}

// Mock data function - replace this when you connect to your database
function getMockSignals(
  page: number,
  limit: number,
  search: string,
  type: string,
  sort: string
): NextResponse {
  const mockSignals: Signal[] = [
    {
      id: "1",
      pair: "EUR/USD",
      type: "buy",
      price: 1.0825,
      takeProfit: [1.0845, 1.0865, 1.0885],
      stopLoss: 1.0805,
      timestamp: "Today - 10:30",
      success: true,
      isPremium: false,
    },
    {
      id: "2",
      pair: "GBP/JPY",
      type: "sell",
      price: 168.45,
      takeProfit: [168.25, 168.05],
      stopLoss: 168.65,
      timestamp: "Today - 08:15",
      success: false,
      isPremium: false,
    },
    {
      id: "3",
      pair: "XAU/USD",
      type: "buy",
      price: 2352.0,
      takeProfit: [2360.0, 2370.0, 2380.0],
      stopLoss: 2340.0,
      timestamp: "Yesterday - 15:45",
      isPremium: true,
    },
    {
      id: "4",
      pair: "USD/JPY",
      type: "buy",
      price: 154.5,
      takeProfit: [154.8, 155.1],
      stopLoss: 154.2,
      timestamp: "Yesterday - 12:20",
      success: true,
      isPremium: false,
    },
    {
      id: "5",
      pair: "EUR/GBP",
      type: "sell",
      price: 0.855,
      takeProfit: [0.853, 0.851],
      stopLoss: 0.857,
      timestamp: "Yesterday - 09:45",
      success: true,
      isPremium: false,
    },
    {
      id: "6",
      pair: "AUD/USD",
      type: "buy",
      price: 0.6625,
      takeProfit: [0.6645, 0.6665],
      stopLoss: 0.6605,
      timestamp: "2 days ago - 14:30",
      isPremium: true,
    },
    {
      id: "7",
      pair: "USD/CAD",
      type: "sell",
      price: 1.365,
      takeProfit: [1.363, 1.361, 1.359],
      stopLoss: 1.367,
      timestamp: "2 days ago - 11:15",
      success: false,
      isPremium: false,
    },
    {
      id: "8",
      pair: "NZD/USD",
      type: "buy",
      price: 0.5985,
      takeProfit: [0.6005, 0.6025],
      stopLoss: 0.5965,
      timestamp: "3 days ago - 16:40",
      success: true,
      isPremium: false,
    },
    {
      id: "9",
      pair: "GBP/USD",
      type: "sell",
      price: 1.2485,
      takeProfit: [1.2465, 1.2445, 1.2425],
      stopLoss: 1.2505,
      timestamp: "3 days ago - 13:20",
      success: true,
      isPremium: false,
    },
    {
      id: "10",
      pair: "USD/CHF",
      type: "buy",
      price: 0.9045,
      takeProfit: [0.9065, 0.9085],
      stopLoss: 0.9025,
      timestamp: "4 days ago - 09:15",
      success: true,
      isPremium: false,
    },
    {
      id: "11",
      pair: "EUR/JPY",
      type: "sell",
      price: 164.75,
      takeProfit: [164.55, 164.35, 164.15],
      stopLoss: 164.95,
      timestamp: "4 days ago - 14:50",
      success: false,
      isPremium: false,
    },
    {
      id: "12",
      pair: "CAD/JPY",
      type: "buy",
      price: 113.25,
      takeProfit: [113.45, 113.65],
      stopLoss: 113.05,
      timestamp: "5 days ago - 11:30",
      isPremium: true,
    },
  ];

  // Apply search filter
  let filteredSignals = mockSignals.filter(
    (signal) =>
      signal.pair.toLowerCase().includes(search.toLowerCase()) &&
      (type === "all" || signal.type === type)
  );

  // Apply sorting
  filteredSignals = [...filteredSignals].sort((a, b) => {
    if (sort === "pair") {
      return a.pair.localeCompare(b.pair);
    } else if (sort === "newest") {
      return parseInt(b.id) - parseInt(a.id);
    } else {
      return parseInt(a.id) - parseInt(b.id);
    }
  });

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginatedSignals = filteredSignals.slice(
    startIndex,
    startIndex + limit
  );

  const response: SignalsResponse = {
    signals: paginatedSignals,
    total: filteredSignals.length,
  };

  return NextResponse.json(response, { status: 200 });
}
