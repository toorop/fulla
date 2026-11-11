// Docs pages in the order of the sidebar, for llms.txt and llms-full.txt.
const ORDER = [
	'docs',
	'docs/install',
	'docs/first-run',
	'docs/generative-fill',
	'docs/generative-fill/remove-and-extend',
	'docs/generative-fill/reference-images',
	'docs/generative-fill/variations',
	'docs/generative-fill/resolution',
	'docs/generative-fill/tone-matching',
	'docs/generative-fill/cost',
	'docs/generative-fill/tips',
	'docs/providers',
	'docs/models',
	'docs/colours',
	'docs/troubleshooting',
	'docs/faq',
	'docs/privacy',
	'docs/changelog',
];

export function docsInOrder<T extends { id: string }>(docs: T[]): T[] {
	const rank = (id: string) => {
		const i = ORDER.indexOf(id.replace(/\/index$/, ''));
		return i === -1 ? ORDER.length : i;
	};
	return [...docs].sort((a, b) => rank(a.id) - rank(b.id));
}
