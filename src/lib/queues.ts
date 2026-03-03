export interface Queue {
  slug: string;
  label: string;
  order: number;
}

export const QUEUES: Queue[] = [
  { slug: "planning", label: "Planning", order: 0 },
  { slug: "development", label: "Development", order: 1 },
  { slug: "done", label: "Done", order: 2 },
];

export function getNextQueue(currentSlug: string): Queue | null {
  const current = QUEUES.find((q) => q.slug === currentSlug);
  if (!current) return null;
  return QUEUES.find((q) => q.order === current.order + 1) ?? null;
}

export function isValidQueue(slug: string): boolean {
  return QUEUES.some((q) => q.slug === slug);
}
