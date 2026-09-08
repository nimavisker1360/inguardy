import { NextResponse } from "next/server";
import { MongoClient, Db } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface WeeklySignal {
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

interface WeeklySignalsResponse {
  signals: WeeklySignal[];
  totalProfit: number;
  total: number;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const search = searchParams.get("search") || "";

    // DB connection (cached on global)
    let cachedClient: MongoClient | null =
      (global as any).__WEEKLY_DB_CLIENT__ || null;
    let cachedDb: Db | null = (global as any).__WEEKLY_DB__ || null;

    const connectToDatabase = async () => {
      if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
      }
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error("MONGODB_URI is not defined in environment variables");
      }
      const client = new MongoClient(mongoUri);
      await client.connect();
      const db = client.db("signals");
      (global as any).__WEEKLY_DB_CLIENT__ = client;
      (global as any).__WEEKLY_DB__ = db;
      cachedClient = client;
      cachedDb = db;
      return { client, db };
    };

    const { db } = await connectToDatabase();
    const collection = db.collection("weekly");

    const query: any = {};
    if (search) {
      query.symbol = { $regex: search, $options: "i" };
    }

    const docs = await collection
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .toArray();

    const parseNumber = (value: any, fallback: number) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const cleaned = value.replace(/[^\d.+-]/g, "");
        const num = parseFloat(cleaned);
        if (Number.isFinite(num)) return num;
      }
      return fallback;
    };

    const mapped: WeeklySignal[] = docs.map((doc: any) => {
      const rawType = (doc.type ?? "buy").toString().toLowerCase();
      const type: "buy" | "sell" = rawType.includes("buy")
        ? "buy"
        : rawType.includes("sell")
          ? "sell"
          : "buy";

      const profit = parseNumber(doc.profit, 0);
      const statusRaw = (doc.status ?? "").toString().toLowerCase();
      const status: "Successful" | "Unsuccessful" = statusRaw.includes("succ")
        ? "Successful"
        : statusRaw.includes("unsucc") ||
            statusRaw.includes("fail") ||
            profit < 0
          ? "Unsuccessful"
          : "Successful";

      return {
        id: doc._id?.toString?.() ?? String(doc.id ?? ""),
        pair: (doc.symbol ?? doc.pair ?? "").toString().trim(),
        type,
        entryPrice: parseNumber(doc.entry ?? doc.entryPrice, 0),
        stopLoss: parseNumber(doc.stopLoss ?? doc.sl, 0),
        target: parseNumber(doc.exit ?? doc.target ?? doc.tp, 0),
        time:
          doc.time ??
          doc.date ??
          doc.createdAt?.toISOString?.() ??
          new Date().toISOString(),
        status,
        volume: parseNumber(doc.lot ?? doc.volume, 0.1),
        profit,
        premium: (doc.premium ?? doc.isPremium) ? "premium" : "free",
      };
    });

    const totalProfit = mapped.reduce((sum, s) => sum + s.profit, 0);

    const response: WeeklySignalsResponse = {
      signals: mapped,
      totalProfit,
      total: mapped.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch weekly signals" },
      { status: 500 }
    );
  }
}
