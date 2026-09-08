import { NextRequest, NextResponse } from "next/server";
import { MongoClient, Db } from "mongodb";

interface DailySignal {
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

interface DailySignalsResponse {
  signals: DailySignal[];
  totalProfit: number;
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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const collection = db.collection("daily"); // نام collection برای daily signals

    // Build query
    const query: any = {};
    if (search) {
      query.symbol = { $regex: search, $options: "i" };
    }

    // Fetch signals from MongoDB
    const signals = await collection
      .find(query)
      .sort({ date: -1, createdAt: -1 }) // Sort by date first, then createdAt
      .limit(50)
      .toArray();

    // Transform MongoDB documents to DailySignal interface
    const parseNumber = (value: any, fallback: number) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const cleaned = value.replace(/[^\d.+-]/g, "");
        const num = parseFloat(cleaned);
        if (Number.isFinite(num)) return num;
      }
      return fallback;
    };

    const transformedSignals: DailySignal[] = signals.map((doc: any) => {
      // Normalize type to only "buy" or "sell" for consistent UI coloring
      const rawType = (doc.type ?? "buy").toString().toLowerCase();
      const normalizedType = rawType.includes("buy")
        ? "buy"
        : rawType.includes("sell")
          ? "sell"
          : "buy";

      return {
        id: doc._id?.toString?.() ?? String(doc.id ?? ""),
        pair: (doc.symbol ?? doc.pair ?? "").toString().trim(),
        type: normalizedType,
        entryPrice: parseNumber(doc.entry ?? doc.entryPrice, 0),
        stopLoss: parseNumber(doc.stopLoss ?? doc.sl, 0),
        // Some datasets store the realized/target price in `exit`
        target: parseNumber(doc.exit ?? doc.target ?? doc.tp, 0),
        time:
          doc.time ??
          doc.date ??
          doc.createdAt?.toISOString?.() ??
          new Date().toISOString(),
        status: (doc.status ?? "Active").toString(),
        volume: parseNumber(doc.lot ?? doc.volume, 0.1),
        profit: parseNumber(doc.profit, 0),
        premium: (doc.premium ?? doc.isPremium) ? "premium" : "free",
      };
    });

    // Calculate total profit from fetched signals
    const totalProfit = transformedSignals.reduce(
      (sum, signal) => sum + signal.profit,
      0
    );

    const response: DailySignalsResponse = {
      signals: transformedSignals,
      totalProfit: totalProfit,
    };

    return NextResponse.json(response);
  } catch {

    // Fallback to mock data if MongoDB is not available
    const mockSignals: DailySignal[] = [
      {
        id: "1",
        pair: "EUR/USD",
        type: "buy",
        entryPrice: 1.1654,
        stopLoss: 1.1634,
        target: 1.1684,
        time: "08/30/2025, 09:15 AM",
        status: "Successful",
        volume: 0.1,
        profit: 28.5,
        premium: "free",
      },
      {
        id: "2",
        pair: "GBP/USD",
        type: "sell",
        entryPrice: 1.3485,
        stopLoss: 1.3505,
        target: 1.3455,
        time: "08/30/2025, 11:20 AM",
        status: "Successful",
        volume: 0.08,
        profit: 24.2,
        premium: "premium",
      },
      {
        id: "3",
        pair: "USD/JPY",
        type: "buy",
        entryPrice: 153.2,
        stopLoss: 152.8,
        target: 153.8,
        time: "08/30/2025, 02:30 PM",
        status: "Active",
        volume: 0.12,
        profit: 0,
        premium: "free",
      },
    ];

    // Apply search filter to mock data
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    let filteredSignals = mockSignals;
    if (search) {
      filteredSignals = mockSignals.filter((signal) =>
        signal.pair.toLowerCase().includes(search.toLowerCase())
      );
    }

    const totalProfit = filteredSignals.reduce(
      (sum, signal) => sum + signal.profit,
      0
    );

    return NextResponse.json({
      signals: filteredSignals,
      totalProfit: totalProfit,
    });
  }
}
