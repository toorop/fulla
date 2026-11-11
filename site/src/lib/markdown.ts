// Every docs page also exists as Markdown, for AI assistants: /docs/install/ -> /docs/install.md.
export const SITE = 'https://fulla.dppst.com';

export function markdownUrl(id: string): string {
	return `/${id.replace(/\/index$/, '')}.md`;
}

/** A page as Markdown: its title, its description, then its body as written. */
export function pageMarkdown(entry: { id: string; data: { title: string; description?: string }; body?: string }): string {
	const url = `${SITE}/${entry.id.replace(/\/index$/, '')}/`;
	const head = [`# ${entry.data.title}`, '', `URL: ${url}`];
	if (entry.data.description) head.push('', `> ${entry.data.description}`);
	// MDX pages: drop imports and components, which mean nothing outside the HTML page.
	const body = (entry.body ?? '')
		.split('\n')
		.filter((l) => !/^import\s/.test(l) && !/^<[A-Z][A-Za-z]*[^>]*\/>\s*$/.test(l.trim()))
		.join('\n')
		.replace(/\]\(\//g, `](${SITE}/`)
		.trim();
	return `${head.join('\n')}\n\n${body}\n`;
}
