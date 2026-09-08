import { MongoClient } from "mongodb";

const uri =
  process.env.MONGODB_URI?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_DIRECT?.trim();

if (!uri) {
  throw new Error("MONGODB_URI or DATABASE_URL is required");
}

declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global.mongoClientPromise) {
    const client = new MongoClient(uri);
    global.mongoClientPromise = client.connect();
  }

  clientPromise = global.mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
