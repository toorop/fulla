---
title: Providers
description: The AI services Fulla works with, OpenRouter, Google and OpenAI, and what each one needs before the first image.
# Tab and share title, richer than the page heading for search results.
head:
  - tag: title
    content: "Providers: OpenRouter, Google or OpenAI keys | Fulla"
  - tag: meta
    attrs: { property: og:title, content: "Providers: OpenRouter, Google or OpenAI keys | Fulla" }
---

A provider is the AI service Fulla sends your request to, and the one that bills you. Fulla works with three. You can connect several and switch from the model button.

## OpenRouter (recommended)

One account for every model Fulla offers. **Connect with OpenRouter** in the panel: no key to create. A new account needs credits before its first image; OpenRouter shows the exact amount billed for each run.

## Google (Gemini API)

Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Gemini's free tier allows no image generation, so **billing must be turned on** in your Google account.

## OpenAI

Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). Your account needs credits, and OpenAI image models may also need your **organization verified**.

When one of these blocks a run, Fulla names it in the card, with a **Report a bug** button that opens a ready-made GitHub issue.
