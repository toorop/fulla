// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { umamiAttrs, tagLinksScript } from './src/lib/analytics.mjs';

const umami = umamiAttrs();
const linksScript = tagLinksScript();

// Home page and marketing pages are plain Astro pages (src/pages); the docs under /docs/ are
// Starlight. URLs are final once released: lowercase, hyphens, trailing slash everywhere.
export default defineConfig({
	site: 'https://fulla.dppst.com',
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: 'Fulla',
			description: 'Fulla is a free Photoshop plugin for generative fill, paid per image to the AI service you connect.',
			logo: { light: './src/assets/logo-light.svg', dark: './src/assets/logo.svg' },
			favicon: '/favicon.svg',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/toorop/fulla' }],
			editLink: { baseUrl: 'https://github.com/toorop/fulla/edit/main/site/' },
			lastUpdated: true,
			head: [
				{ tag: 'meta', attrs: { property: 'og:image', content: 'https://fulla.dppst.com/og.jpg' } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { property: 'og:image:alt', content: 'Fulla: generative fill in Photoshop. Pay only for the images you make. A photo of a pier, before and after a boat is removed.' } },
				{ tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
				{ tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
				...(umami ? [{ tag: 'script', attrs: umami }] : []),
				...(linksScript ? [{ tag: 'script', content: linksScript }] : []),
			],
			customCss: ['@fontsource-variable/hanken-grotesk', './src/styles/tokens.css', './src/styles/docs.css'],
			components: {
				// Dark by default, a plain light/dark switch instead of three choices.
				ThemeProvider: './src/components/starlight/ThemeProvider.astro',
				ThemeSelect: './src/components/starlight/ThemeSelect.astro',
				// The Download button stays visible in the docs header too.
				SocialIcons: './src/components/starlight/SocialIcons.astro',
				// "Copy page as Markdown" next to the title, and the Markdown version announced in <head>.
				PageTitle: './src/components/starlight/PageTitle.astro',
				Head: './src/components/starlight/Head.astro',
			},
			sidebar: [
				{ label: 'Getting started', items: ['docs/install', 'docs/first-run'] },
				{
					label: 'Generative fill',
					items: [
						{ label: 'Your first fill', slug: 'docs/generative-fill' },
						'docs/generative-fill/remove-and-extend',
						'docs/generative-fill/reference-images',
						'docs/generative-fill/variations',
						'docs/generative-fill/resolution',
						'docs/generative-fill/tone-matching',
						'docs/generative-fill/cost',
						'docs/generative-fill/tips',
					],
				},
				{ label: 'Providers and models', items: ['docs/providers', 'docs/models'] },
				{
					label: 'Help',
					items: [
						'docs/colours',
						'docs/troubleshooting',
						'docs/faq',
						'docs/privacy',
						'docs/changelog',
						{ label: 'About Fulla', link: '/about/' },
					],
				},
			],
		}),
	],
});
