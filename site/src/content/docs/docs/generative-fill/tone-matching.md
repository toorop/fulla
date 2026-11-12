---
title: Tone matching
description: Fulla compares the result with your photo around the selection, then evens out the tones with a Curves filter and, where the drift is local, a correction layer.
---

Models often shift the colours of what they return, over the whole picture or in one part of it only: a sky a little too bright along the edge of an extended canvas, for example. Fulla compares the result with your photo around the selection and, when needed, corrects it in two steps:

- a **Curves** smart filter on the new layer, for a shift over the whole picture;
- a **Fulla: tone fix** layer clipped to the new layer, in Linear Light mode, for what is left next to the selection. Fulla measures the difference all along the selection's edge and carries it smoothly inside, so the fill meets your photo at every point of the edge.

## Adjust or turn it off

Both are ordinary Photoshop items: hide the filter or the layer to compare, open the filter to adjust the curves, or paint on the tone fix layer (mid-grey changes nothing). Nothing is added when the tones already match. Each variation you pick gets its own correction.

For colours to match in documents that aren't sRGB, Photoshop must keep embedded profiles: see [Colours](/docs/colours/).
