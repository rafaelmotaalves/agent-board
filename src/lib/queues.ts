export interface Queue {
  slug: string;
  label: string;
  order: number;
}

export const SLUG_PLANNING = "planning";
export const SLUG_DEVELOPMENT = "development";
export const SLUG_DONE = "done";

export const QUEUES: Queue[] = [
  { slug: SLUG_PLANNING, label: "Planning", order: 0 },
  { slug: SLUG_DEVELOPMENT, label: "Development", order: 1 },
  { slug: SLUG_DONE, label: "Done", order: 2 },
];

export function getNextQueue(currentSlug: string): Queue | null {
  const current = QUEUES.find((q) => q.slug === currentSlug);
  if (!current) return null;
  return QUEUES.find((q) => q.order === current.order + 1) ?? null;
}

export function isValidQueue(slug: string): boolean {
  return QUEUES.some((q) => q.slug === slug);
}
