import { notFound } from "next/navigation";
import { fetchJournalApi, JournalApiError } from "@/app/journal/_lib/journal-api";
import { PlaybookForm } from "@/components/journal/PlaybookForm";
import type { PlaybookStrategyDto } from "@/types/playbooks";

export const dynamic = "force-dynamic";

type EditPlaybookPageProps = {
  params: Promise<{ id: string }>;
};

type PlaybookResponse = {
  success: boolean;
  playbook?: PlaybookStrategyDto;
};

export default async function EditPlaybookPage({ params }: EditPlaybookPageProps) {
  const { id } = await params;
  const response = await fetchJournalApi<PlaybookResponse>(
    `/api/journal/playbooks/${id}`
  ).catch((error: unknown) => {
    if (error instanceof JournalApiError && error.status === 404) {
      notFound();
    }

    throw error;
  });

  if (!response.playbook) {
    notFound();
  }

  return <PlaybookForm playbook={response.playbook} />;
}
