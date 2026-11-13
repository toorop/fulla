---
title: Limits
description: "What Fulla and the AI models behind it can't do yet, and how to work around it: the 4K ceiling, the selection's edge, billing after Cancel, colour profiles."
# Tab and share title, richer than the page heading for search results.
head:
  - tag: title
    content: "Limits of generative fill in Photoshop with Fulla"
  - tag: meta
    attrs: { property: og:title, content: "Limits of generative fill in Photoshop with Fulla" }
---

Fulla relies on AI models that are good, but not perfect. Here is what to expect, and what to do about it.

## About 4K at most

The models return at most about 4K pixels on the long side, 2K for OpenAI and Qwen models. A larger selection gets a result enlarged to fit, which looks softer. When that happens, the card says so: "Large area: enlarged 2.1x, may look soft. Try a higher resolution or a smaller selection."

To keep it sharp, fill a large area in several parts, as when [extending a photo](/docs/generative-fill/remove-and-extend/) band by band. See [Resolution](/docs/generative-fill/resolution/).

## The model treats the selection as a guide

Models don't stop exactly at the edge of the area they were given. Fulla clips their result to your selection, with a soft edge, so nothing outside it changes. But an object the model added can be cut where the selection ends: [select generously](/docs/generative-fill/tips/#select-generously) and leave room for shadows.

## The model may redraw more than the area

Now and then a model redraws the whole picture it was sent, not only the area to fill. The result then looks slightly shifted or different along the edge. Fulla places what comes back exactly where it belongs, but it can't tell yet that the model did this. Generate again, or keep another [variation](/docs/generative-fill/variations/).

## Cancel may still be billed

**Cancel** stops Fulla from using the result, and Fulla never sends a new request after it. But a request the AI service has already received may still be billed.

## Colour profiles

Colours match your document only when Photoshop keeps embedded profiles: see [Colours](/docs/colours/). A result that an AI service sends back as WebP gets no colour profile yet; PNG and JPEG results do. It hasn't happened with the current models so far.

## Some models see less of the photo

Fulla sends the whole photo along as a reference, so the model can judge scale and light. Qwen models have no room for it and only see the area to fill with its margin. The number of [reference images](/docs/generative-fill/reference-images/) also depends on the model.

## Online only, Photoshop 2026 only

Every image is made by an online AI service: Fulla needs an internet connection and an account with credit. It runs in Photoshop 2026 (27.11 or later) and the Photoshop beta, not in older versions. The Windows installer is for Windows only; on macOS, [install](/docs/install/) the `.ccx` with the Creative Cloud app.
