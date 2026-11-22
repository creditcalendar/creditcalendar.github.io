import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publishedPosts } from '../lib/posts';
import { postURL } from '../lib/content-utils.mjs';

export async function GET(context: APIContext) {
  return rss({
    title: 'Credit Calendar',
    description: 'Product news and updates from Credit Calendar.',
    site: context.site!,
    items: (await publishedPosts()).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postURL(post.id),
      categories: post.data.categories,
    })),
  });
}
