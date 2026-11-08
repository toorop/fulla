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

/**
 * When the whole photograph goes along (reduced) so the model can judge scale, light and perspective
 * (roadmap 3.3). `which` names it: "Image 3", or "The second image" at OpenAI.
 */
function sceneNote(which) {
  return `${which} is the whole photograph, reduced, showing where this area sits: use it only to judge scale, light and perspective. Do not edit it or return it. `;
}

/**
 * The whole instruction for APIs without a mask parameter (OpenRouter, Gemini): the mask goes as a
 * second image, white = change. `scene`: the whole photo follows as image 3.
 */
function maskImagePrompt(task, scene) {
  return (
    (scene ? "You are given three images; images 1 and 2 have the same size. " : "You are given two images of the same size. ") +
    "Image 1 is a picture. Image 2 is a mask: white marks the area to change, black marks the area to keep. " +
    (scene ? sceneNote("Image 3") : "") +
    task +
    " Change only the white area of image 1. Keep every black area identical, with the same framing, size, perspective and lighting. " +
    "Return the full edited image 1 only: no mask, borders, text or watermarks."
  );
}

/** The whole instruction for OpenAI, whose mask is a real parameter (transparent = change). */
function alphaMaskPrompt(task, scene) {
  return (
    "Edit only the transparent area of the mask on the first image. " +
    (scene ? sceneNote("The second image") : "") +
    task +
    " Keep everything outside that area unchanged, with the same framing, perspective and lighting. No borders, text or watermarks."
  );
}

module.exports = { taskFor, sceneNote, maskImagePrompt, alphaMaskPrompt };
