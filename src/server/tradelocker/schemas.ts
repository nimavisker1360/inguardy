import { z } from "zod";

export const tradeLockerEnvironmentSchema = z.enum(["LIVE", "DEMO"]);
export type TradeLockerEnvironment = z.infer<typeof tradeLockerEnvironmentSchema>;

export const connectTradeLockerSchema = z.object({
  environment: tradeLockerEnvironmentSchema,
  server: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(512),
});

export const selectTradeLockerAccountSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
  accountId: z.string().trim().min(1).max(128),
});

export const tradeLockerTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expireDate: z.string().datetime({ offset: true }),
});

const idValue = z.union([z.string(), z.number()]).transform(String);
const optionalNumber = z.union([z.number(), z.string()]).transform(Number).optional();

export const tradeLockerAccountSchema = z.object({
  id: idValue,
  name: z.string().optional().default("TradeLocker account"),
  currency: z.string().optional().default("USD"),
  status: z.string().optional().nullable(),
  accNum: idValue,
  aaccountBalance: optionalNumber,
}).passthrough();

export const allTradeLockerAccountsSchema = z.object({
  accounts: z.array(tradeLockerAccountSchema),
});

export const tradeLockerDetailedAccountSchema = z.object({
  id: idValue,
  name: z.string(),
  currency: z.string().optional(),
  status: z.string().optional(),
  type: z.enum(["demo", "live"]).optional(),
}).passthrough();

export const tradeLockerConfigSchema = z.object({
  s: z.string(),
  d: z.object({
    accountDetailsConfig: z.object({ columns: z.array(z.object({ id: z.string() }).passthrough()) }),
    positionsConfig: z.object({ columns: z.array(z.object({ id: z.string() }).passthrough()) }),
    ordersConfig: z.object({ columns: z.array(z.object({ id: z.string() }).passthrough()) }),
    ordersHistoryConfig: z.object({ columns: z.array(z.object({ id: z.string() }).passthrough()) }),
    filledOrdersConfig: z.object({ columns: z.array(z.object({ id: z.string() }).passthrough()) }).optional(),
  }).passthrough(),
});

const tableRow = z.array(z.unknown());

export const tradeLockerStateSchema = z.object({
  s: z.string(),
  d: z.object({ accountDetailsData: z.array(z.unknown()) }),
});

export const tradeLockerPositionsSchema = z.object({
  s: z.string(),
  d: z.object({ positions: z.array(tableRow) }),
});

export const tradeLockerOrdersSchema = z.object({
  s: z.string(),
  d: z.object({ orders: z.array(tableRow) }),
});

export const tradeLockerOrderHistorySchema = z.object({
  s: z.string(),
  d: z.object({
    ordersHistory: z.array(tableRow),
    hasMore: z.boolean().optional().default(false),
  }),
});

export const tradeLockerExecutionsSchema = z.object({
  s: z.string(),
  d: z.object({ executions: z.array(tableRow) }),
});

const tradeLockerInstrumentSchema = z.object({
  id: idValue,
  tradableInstrumentId: idValue,
  name: z.string(),
  type: z.string().optional(),
}).passthrough();

export const tradeLockerInstrumentsSchema = z.object({
  s: z.string(),
  d: z.object({ instruments: z.array(tradeLockerInstrumentSchema) }),
});

export const tradeLockerAccountDetailsSchema = z.object({
  s: z.string(),
  d: z.array(tradeLockerDetailedAccountSchema),
});

const finiteHistoryNumber = z.union([z.number(), z.string()])
  .transform(Number)
  .pipe(z.number().finite());

export const tradeLockerHistorySchema = z.object({
  s: z.string(),
  d: z.object({
    barDetails: z.array(z.object({
      t: finiteHistoryNumber,
      o: finiteHistoryNumber,
      h: finiteHistoryNumber,
      l: finiteHistoryNumber,
      c: finiteHistoryNumber,
      v: finiteHistoryNumber,
    })),
  }).optional(),
}).passthrough();

export type TradeLockerResolution = "1m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D" | "1W" | "1M";

export type TradeLockerAccount = z.infer<typeof tradeLockerAccountSchema>;
export type TradeLockerTokens = z.infer<typeof tradeLockerTokenSchema>;
export type TradeLockerConfig = z.infer<typeof tradeLockerConfigSchema>;
export type TradeLockerInstrument = z.infer<typeof tradeLockerInstrumentSchema>;
export type TradeLockerHistoryBar = NonNullable<
  z.infer<typeof tradeLockerHistorySchema>["d"]
>["barDetails"][number];
