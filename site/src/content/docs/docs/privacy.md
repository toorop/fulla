---
title: Privacy and security
description: Where your photos and keys go with Fulla. No Fulla server; keys stay in Photoshop's secure storage; OpenRouter connection with OAuth and PKCE. What this website collects.
# Tab and share title, richer than the page heading for search results.
head:
  - tag: title
    content: "Privacy and security of the Fulla plugin for Photoshop and its website"
  - tag: meta
    attrs: { property: og:title, content: "Privacy and security of the Fulla plugin for Photoshop and its website" }
---

Fulla hosts nothing. Your photo goes from Photoshop straight to the AI service you chose, and nowhere else.

## What is sent

The area you selected with some of the photo around it, a mask, and the whole photo reduced when the selection is a small part of it, so the model can judge scale and light. Plus your prompt and any [reference images](/docs/generative-fill/reference-images/).

## Your keys

Keys stay on your computer, in Photoshop's secure storage, and go only to their provider. **Remove** in the Providers tab deletes one.

## Is connecting to OpenRouter safe?

Yes. Fulla uses OAuth with PKCE: it makes up a secret that never leaves your computer, and the code OpenRouter shows you is useless without it. OpenRouter hands the key straight to the panel. You only deal with openrouter.ai, where you can set a spending limit and an expiry date for the key.

## Can I check?

Fulla is open source. The connection code is in [`plugin/src/connect.js`](https://github.com/toorop/fulla/blob/main/plugin/src/connect.js).

## This website

This website is published by Stéphane Depierrepont (see the [legal notice](/legal/)), who is responsible for the data below. It sets no cookies, shows no ads, and has no account or form.

- **Hosting.** Cloudflare serves the site. Like any web server, it receives your IP address and browser details to deliver the pages and protect the site, and keeps its logs under its own [privacy policy](https://www.cloudflare.com/privacypolicy/). Cloudflare is a US company; transfers to the United States rely on the EU–US Data Privacy Framework.
- **Visit statistics.** [Umami](https://umami.is/), run by Stéphane on his own server in France, counts page views and clicks on links and buttons: the page, the site you came from, your browser, operating system, type of device, screen size, language and approximate location (country, region, city). It sets no cookies and doesn't keep your IP address. These statistics, which identify no one, are kept while the site exists.

Both rest on a legitimate interest: running the site, keeping it safe, and knowing which pages are read. You can ask to see, correct or erase data about you, or object to its use, through the [contact form](https://dppst.com/#contact-form). You can also complain to the [CNIL](https://www.cnil.fr/en), the French data protection authority.
