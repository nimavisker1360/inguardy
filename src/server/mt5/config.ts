import { getConfiguredMt5JournalApiUrl } from "@/lib/deployment-url";

export function getMt5JournalApiUrl(request?: Request) {
  return getConfiguredMt5JournalApiUrl(request);
}
