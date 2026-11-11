---
title: Privacy and security
description: Where your photos and keys go with Fulla. No Fulla server; keys stay in Photoshop's secure storage; OpenRouter connection with OAuth and PKCE.
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
