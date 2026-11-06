// What the model is asked to do. Providers wrap this with their own mask instructions.

/** With a prompt, paint it in the selection; without one, remove what is selected. */
function taskFor(userPrompt) {
  const p = (userPrompt || "").trim();
  return p
    ? `In the area to change, paint: ${p}. Match the surrounding lighting, perspective, colour, grain and focus so it blends in naturally.`
    : "Remove everything inside the area to change and rebuild what was behind it, so the image looks untouched. Do not add new objects, people, text or logos.";
}

module.exports = { taskFor };
