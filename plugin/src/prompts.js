// What the model is asked to do. Providers wrap this with their own mask instructions.

/**
 * With a prompt, edit the selection as asked (add or change something); without one, fill the
 * selection so it continues the image: remove what is there, or extend the scene into an empty
 * area (an enlarged canvas). Like Photoshop's Generative Fill with an empty prompt.
 */
function taskFor(userPrompt) {
  const p = (userPrompt || "").trim();
  return p
    ? `Edit the area to change as asked: "${p}". Match the surrounding lighting, perspective, colour, grain and focus so it blends in naturally.`
    : "Fill the area to change so it continues the surrounding image seamlessly: if something is there, remove it and rebuild what was behind it; if the area is empty, extend the scene into it. Do not add new objects, people, text or logos.";
}

module.exports = { taskFor };
