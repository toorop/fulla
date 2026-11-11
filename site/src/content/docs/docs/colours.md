---
title: Colours
description: Make generated results match your document's colour profile, Adobe RGB, ProPhoto or Display P3, by keeping embedded profiles in Photoshop.
---

AI services work in sRGB. Fulla sends them your pixels converted to sRGB and embeds an sRGB profile in what comes back, so Photoshop converts the result into your document's profile (Adobe RGB, ProPhoto, Display P3…) and the colours match the surroundings.

## Check one Photoshop setting

This only works if Photoshop keeps embedded profiles:

1. Open **Edit > Color Settings**.
2. Under **Color Management Policies**, set **RGB** to **Preserve Embedded Profiles** (or Convert to Working RGB), not **Off**.

Presets such as **Monitor Color** turn it off. Photoshop then ignores every embedded profile, and results come back with a slight colour cast. With **Off**, your own photos lose their embedded profile when you open them too.
