import { getCollection } from 'astro:content';
import { isPublished } from './content-utils.mjs';

export async function publishedPosts() {
  const now = new Date();
  return (await getCollection('posts', ({ data }) => isPublished(data, now)))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export function displayDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}
