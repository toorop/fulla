// llms.txt: a table of contents of the docs for AI assistants (llmstxt.org).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, markdownUrl } from '../lib/markdown';
import { docsInOrder } from '../lib/docs-order';

export const GET: APIRoute = async () => {
	const docs = docsInOrder(await getCollection('docs'));
	const lines = [
		'# Fulla',
		'',
		'> Fulla is a free, open-source Photoshop plugin for generative fill. Select an area, say what you want, click Generate, as with Photoshop\'s own generative fill. It uses your own account with an AI service (OpenRouter, Google or OpenAI) and you pay that service per image: no subscription, no credits. MIT licence.',
		'',
		`The whole guide in one file: ${SITE}/llms-full.txt`,
		'',
		'## Docs',
		'',
		...docs.map((d) => `- [${d.data.title}](${SITE}${markdownUrl(d.id)})${d.data.description ? `: ${d.data.description}` : ''}`),
		'',
		'## Pages',
		'',
		`- [Fulla vs Photoshop's generative fill](${SITE}/fulla-vs-photoshop-generative-fill/): price, models, resolution and privacy compared, with the same model on both sides and dated sources.`,
		`- [Photoshop generative credits, explained](${SITE}/photoshop-generative-credits/): credits per fill, per plan and per add-on, and what a credit costs in dollars.`,
		`- [Nano Banana in Photoshop](${SITE}/nano-banana-in-photoshop/): two ways to use Google's Nano Banana models for generative fill in Photoshop.`,
		`- [GPT Image in Photoshop](${SITE}/gpt-image-in-photoshop/): OpenAI's GPT Image models for generative fill in Photoshop with Fulla.`,
		`- [About Fulla](${SITE}/about/): who makes Fulla and why.`,
		'',
		'## Optional',
		'',
		'- [Source code on GitHub](https://github.com/toorop/fulla)',
		'',
	];
	return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
