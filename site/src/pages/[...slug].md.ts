// The Markdown version of each docs page (/docs/install.md), same content as the HTML page.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { pageMarkdown } from '../lib/markdown';

export const getStaticPaths = (async () => {
	const docs = await getCollection('docs');
	return docs.map((entry) => ({ params: { slug: entry.id.replace(/\/index$/, '') }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ entry: CollectionEntry<'docs'> }> = ({ props }) =>
	new Response(pageMarkdown(props.entry), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
