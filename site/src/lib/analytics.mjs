// Umami, self-hosted by Stéphane. Fill in the website id once the site is created in Umami;
// nothing is sent while it is empty, and only fulla.dppst.com is counted (not localhost).
export const UMAMI_SRC = 'https://anlt.dppst.com/script.js';
export const UMAMI_WEBSITE_ID = '0b1003b8-bf59-4882-bfff-7577f8099dbb';
export const UMAMI_DOMAINS = 'fulla.dppst.com';

/** The <script> tag as attributes, or null while no website id is set. */
export function umamiAttrs() {
	return UMAMI_WEBSITE_ID ? { defer: true, src: UMAMI_SRC, 'data-website-id': UMAMI_WEBSITE_ID, 'data-domains': UMAMI_DOMAINS } : null;
}

/** Umami event for a link: 'download' for the GitHub releases, 'outbound' for any other site. */
export function linkEvent(href, host) {
	let url;
	try {
		url = new URL(href);
	} catch {
		return null;
	}
	if (!/^https?:$/.test(url.protocol) || url.host === host) return null;
	return url.host === 'github.com' && url.pathname.startsWith('/toorop/fulla/releases') ? 'download' : 'outbound';
}

/** Gives every link off the site an Umami event with its URL, unless it already has one. Umami
 * reads data-umami-event at click time, and waits for the event before leaving the page. */
export function tagLinks(doc, host) {
	for (const a of doc.querySelectorAll('a[href]')) {
		const name = a.hasAttribute('data-umami-event') ? null : linkEvent(a.href, host);
		if (!name) continue;
		a.setAttribute('data-umami-event', name);
		a.setAttribute('data-umami-event-url', a.href);
	}
}

/** Inline script for every page head, or null while no website id is set. */
export function tagLinksScript() {
	if (!UMAMI_WEBSITE_ID) return null;
	return `document.addEventListener('DOMContentLoaded',()=>{const linkEvent=${linkEvent};(${tagLinks})(document,location.host)});`;
}
