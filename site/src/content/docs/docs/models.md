---
title: Models
description: The models Fulla offers with each provider, and which one to choose. Nano Banana 2.1 is the recommended one.
# Tab and share title, richer than the page heading for search results.
head:
  - tag: title
    content: "Nano Banana, Seedream, GPT Image and more: the models in Fulla"
  - tag: meta
    attrs: { property: og:title, content: "Nano Banana, Seedream, GPT Image and more: the models in Fulla" }
---

A model is what makes the image. The same model can come from more than one provider. **Nano Banana 2.1** is the recommended one and the default.

| Provider | Models |
| --- | --- |
| OpenRouter | Nano Banana 2.1 (default), Nano Banana Pro, Qwen Image 3, Qwen Image 2.1 Pro, MiniMax H3 Image, Seedream 5.5, GPT Image 2.6, GPT Image 2.5 Sunburst |
| Google (Gemini API) | Nano Banana 2.1 (default), Nano Banana Pro, Nano Banana 2 Lite |
| OpenAI | GPT Image 2.5 Sunburst (default), GPT Image 2.5 Flare, GPT Image 2 |

Of these, only Nano Banana Pro is also in Photoshop's own generative fill, which offers Nano Banana 2, not 2.1. Seedream, MiniMax, Qwen Image and GPT Image are not there (checked on 16 November 2026).

## Which one to choose

What we found in our own tests, a handful per model so far, not a benchmark. Prices are for one 2K image through OpenRouter.

- **Nano Banana 2.1**, about $0.06: the one we tested most, on faces, objects added from a reference image and extended canvases, and the most reliable. Start with it, and if you'd rather not test models, stay with it.
- **Seedream 5.5**, about $0.06: very good on a black and white photo where we removed a boat, and it kept the photo's contrast better than MiniMax H3 Image. Worth a try when contrast matters.
- **MiniMax H3 Image**, about $0.04: good on the same photo, for less. Worth it for a simple removal.
- **Qwen Image 3**: it erased a boat behind thin posts well, but it has no room for the whole photo, takes a single reference image, and did clearly worse than Nano Banana 2.1 when adding an object from a reference. Asked to fill the rounded corners of a scanned print “using the reference image”, with no reference image added, it took the photo itself and pasted all of it into the small corner, where Nano Banana 2.1 did well with exactly the same prompt.
- **GPT Image**: kept faces less close to the original than Nano Banana 2.1 in our tests. It is there when you prefer its look.

These tests ran from 6 to 14 November 2026. The panel shows what each run cost, so you can compare on your own photos.

## Pick a model

Pick a model with the button under the prompt. The [settings](/docs/generative-fill/resolution/) only show what the current model lets you choose.

Fulla offers a tested list of models. To ask for another one, use **Request a model or provider** in the panel's menu (≡, top right).
