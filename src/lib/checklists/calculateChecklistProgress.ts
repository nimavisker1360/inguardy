export type ChecklistProgressAnswer = {
  checked: boolean;
  isRequiredSnapshot?: boolean;
  isRequired?: boolean;
};

export type ChecklistProgressChecklist = {
  completedCount?: number | null;
  totalCount?: number | null;
  answers?: ChecklistProgressAnswer[];
};

export function calculateChecklistProgress(answers: ChecklistProgressAnswer[]) {
  const totalCount = answers.length;
  const completedCount = answers.filter((answer) => answer.checked).length;
  const requiredAnswers = answers.filter(
    (answer) => answer.isRequiredSnapshot || answer.isRequired
  );
  const requiredTotalCount = requiredAnswers.length;
  const requiredCompletedCount = requiredAnswers.filter(
    (answer) => answer.checked
  ).length;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    completedCount,
    totalCount,
    requiredCompletedCount,
    requiredTotalCount,
    completionPercent,
  };
}

export function calculateChecklistCollectionProgress(
  checklists: ChecklistProgressChecklist[]
) {
  let completedCount = 0;
  let totalCount = 0;

  for (const checklist of checklists) {
    const answers = checklist.answers || [];

    if (answers.length > 0) {
      totalCount += answers.length;
      completedCount += answers.filter((answer) => answer.checked).length;
      continue;
    }

    const checklistTotal = checklist.totalCount || 0;

    if (checklistTotal > 0) {
      totalCount += checklistTotal;
      completedCount += checklist.completedCount || 0;
    }
  }

  return {
    completedCount,
    totalCount,
    completionPercent:
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null,
  };
}
