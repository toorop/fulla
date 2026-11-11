// llms-full.txt: the whole guide in one file, for an assistant asked to help with Fulla.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { pageMarkdown } from '../lib/markdown';
import { docsInOrder } from '../lib/docs-order';

export const GET: APIRoute = async () => {
	const docs = docsInOrder(await getCollection('docs'));
	const intro = '# Fulla, the complete guide\n\nFulla is a free, open-source Photoshop plugin for generative fill, paid per image to the AI service you connect. Every page of the guide follows.\n';
	const body = [intro, ...docs.map(pageMarkdown)].join('\n---\n\n');
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
