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
	// MDX pages: drop imports and components, which mean nothing outside the HTML page. A component
	// written over several lines (opening tag, text, closing tag) keeps its text, unindented, and so
	// does a wrapping <div>: that text is a caption the reader needs.
	let depth = 0;
	const body = (entry.body ?? '')
		.split('\n')
		.flatMap((l) => {
			const t = l.trim();
			if (/^import\s/.test(l) || /^<[A-Z][A-Za-z]*[^>]*\/>$/.test(t)) return [];
			if (/^<([A-Z][A-Za-z]*|div)(\s[^>]*)?>$/.test(t)) return depth++, [];
			if (/^<\/([A-Z][A-Za-z]*|div)>$/.test(t)) return (depth = Math.max(0, depth - 1)), [];
			return [depth > 0 ? t : l];
		})
		.join('\n')
		.replace(/\]\(\//g, `](${SITE}/`)
		.trim();
	return `${head.join('\n')}\n\n${body}\n`;
}
