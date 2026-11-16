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

**Cancel** stops Fulla from using the result, and Fulla never sends a new request after it. But a request the AI service has already received may still be billed. To cap what you can spend, set a spending limit on your key: OpenRouter lets you do it when you [connect](/docs/first-run/), or later on openrouter.ai.

## Colour profiles

Colours match your document only when Photoshop keeps embedded profiles, one setting to check once. A generated area holds only colours sRGB can show, at 8 bits per channel, and a result sent back as WebP gets no colour profile yet (it hasn't happened with the current models). [Colours](/docs/colours/) explains the setting and what each of these means for your photo.

## Some models see less of the photo

Fulla sends the whole photo along as a reference, so the model can judge scale and light. Qwen models have no room for it and only see the area to fill with its margin. The number of [reference images](/docs/generative-fill/reference-images/) also depends on the model. When the fill depends on the rest of the photo or on references, use Nano Banana 2.1: see [Which one to choose](/docs/models/#which-one-to-choose).

## Online only, Photoshop 27.11 or later

Every image is made by an online AI service: Fulla needs an internet connection and an account with credit. It runs in Photoshop 27.11 or later, including the Photoshop beta, not in older versions. The Windows installer is for Windows only; on macOS, [install](/docs/install/) the `.ccx` with the Creative Cloud app.
