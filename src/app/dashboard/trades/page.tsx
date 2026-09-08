import { redirect } from "next/navigation";

type TradesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendParam(params: URLSearchParams, name: string, value: string | undefined) {
  if (value && value.trim()) {
    params.set(name, value.trim());
  }
}

export default async function TradesPage({ searchParams }: TradesPageProps) {
  const params = (await searchParams) || {};
  const query = new URLSearchParams();

  appendParam(query, "accountId", first(params.accountId));
  appendParam(query, "symbol", first(params.symbol));
  appendParam(query, "status", first(params.status));
  appendParam(query, "tradeType", first(params.direction));
  appendParam(query, "reviewStatus", first(params.reviewStatus));
  appendParam(query, "source", first(params.source));
  appendParam(query, "dateFrom", first(params.from) || first(params.dateFrom) || first(params.date));
  appendParam(query, "dateTo", first(params.to) || first(params.dateTo) || first(params.date));

  redirect(query.size > 0 ? `/journal?${query.toString()}` : "/journal");
}
