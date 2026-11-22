export function isPublished(data: { draft?: boolean; date: Date | string }, now?: Date): boolean;
export function postURL(id: string): string;
export function taxonomyURL(kind: 'tags' | 'categories', name: string): string;
export function matchesSearch(text: string, query: string): boolean;
