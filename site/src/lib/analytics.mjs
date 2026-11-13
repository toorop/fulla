// Umami, self-hosted by Stéphane. Fill in the website id once the site is created in Umami;
// nothing is sent while it is empty, and only fulla.dppst.com is counted (not localhost).
export const UMAMI_SRC = 'https://anlt.dppst.com/script.js';
export const UMAMI_WEBSITE_ID = '0b1003b8-bf59-4882-bfff-7577f8099dbb';
export const UMAMI_DOMAINS = 'fulla.dppst.com';

/** The <script> tag as attributes, or null while no website id is set. */
export function umamiAttrs() {
	return UMAMI_WEBSITE_ID ? { defer: true, src: UMAMI_SRC, 'data-website-id': UMAMI_WEBSITE_ID, 'data-domains': UMAMI_DOMAINS } : null;
}
