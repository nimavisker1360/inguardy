import { redirect } from "next/navigation";

type TradeDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function appendParam(params: URLSearchParams, name: string, value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item?.trim()) {
        params.append(name, item.trim());
      }
    }

    return;
  }

  if (value?.trim()) {
    params.set(name, value.trim());
  }
}

export default async function TradeDetailPage({ params, searchParams }: TradeDetailPageProps) {
  const { id } = await params;
  const query = new URLSearchParams();
  const values = (await searchParams) || {};

  for (const [name, value] of Object.entries(values)) {
    appendParam(query, name, value);
  }

  redirect(query.size > 0 ? `/journal/${id}?${query.toString()}` : `/journal/${id}`);
}
