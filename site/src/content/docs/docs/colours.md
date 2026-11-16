---
title: Colours
description: How Fulla makes a generated fill match the colours of your photo, in sRGB, Adobe RGB, ProPhoto or Display P3 documents. Tone matching, colour profiles, the one Photoshop setting to check, and the limits.
# Tab and share title, richer than the page heading for search results.
head:
  - tag: title
    content: "Colour matching and profiles for generative fill in Photoshop | Fulla"
  - tag: meta
    attrs: { property: og:title, content: "Colour matching and profiles for generative fill in Photoshop | Fulla" }
---

Two things usually give a fill away: tones that drift from the photo around it, and colours read in the wrong profile. Fulla handles both after every run, with ordinary Photoshop layers you can check and adjust.

## Tones matched to your photo

Models often return colours slightly off: a little brighter, warmer or more contrasted than your photo, over the whole picture or along one side only. Fulla compares the result with your photo in a ring around the selection, then corrects it:

- a **Curves** smart filter on the new layer, one curve per channel, for a shift over the whole result;
- a **Fulla: tone fix** layer clipped to the new layer, in Linear Light mode, for what is left next to the selection. The difference is measured all along the edge and carried smoothly inside, so the fill meets your photo at every point of the edge.

Nothing is added when the tones already match. Hide the filter or the layer to compare, open the filter to change the curves, or paint on the tone fix layer (mid-grey changes nothing). Details in [Tone matching](/docs/generative-fill/tone-matching/).

## The right profile, in any document

AI services work in sRGB. Fulla sends them your pixels converted to sRGB, and embeds an sRGB profile in the PNG or JPEG that comes back. Photoshop then converts the result into your document's profile, Adobe RGB, ProPhoto, Display P3 or any other.

Without that profile, Photoshop would read the sRGB values as if they were in your document's profile: in an Adobe RGB document the fill would look more saturated than the photo around it, in ProPhoto much more.

## What it changes

Once placed, the fill is in the same colour space as the rest of your photo. When you convert to a printer profile, soft-proof or export in another colour space, it follows like every other pixel, so the join that matched on screen still matches in print. And on the areas where a mismatch shows most, a sky, a skin tone or a plain wall, the tone correction keeps the edge from turning into a visible band.

## Check one Photoshop setting

The profile only helps if Photoshop keeps embedded profiles:

1. Open **Edit > Color Settings**.
2. Under **Color Management Policies**, set **RGB** to **Preserve Embedded Profiles** (or Convert to Working RGB), not **Off**.

Presets such as **Monitor Color** turn it off. Photoshop then ignores every embedded profile, and results come back with a slight colour cast. With **Off**, your own photos lose their embedded profile when you open them too.

## Limits

- **sRGB colours only in the fill.** The model sees and returns sRGB. In an Adobe RGB or ProPhoto document, a very saturated colour next to the selection, beyond what sRGB can show, may come back slightly duller.
- **8 bits per channel.** Models return 8-bit images. In a 16-bit document, the tone corrections are made at 16 bits, but the generated image itself has 8 bits per channel.
- **RGB and greyscale documents.** Greyscale documents get a single curve. CMYK and Lab documents get no tone correction yet.
- **Corrected from the edge.** Fulla measures the drift next to the selection. A colour the model changed only deep inside a large selection isn't corrected.
- **WebP results.** A result an AI service sends back as WebP gets no profile yet; PNG and JPEG results do. It hasn't happened with the current models so far.
