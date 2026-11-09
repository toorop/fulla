// What the model is asked to do. Providers wrap this with their own mask instructions.
// The user's prompt says what to do; the built-in text only says what each image is (his call,
// 2026-11-09: nobody is held back by instructions they did not write).

/**
 * With a prompt, edit the selection as asked (add or change something); without one, fill the
 * selection so it continues the image: remove what is there, or extend the scene into an empty
 * area (an enlarged canvas). Like Photoshop's Generative Fill with an empty prompt. With reference
 * images and no prompt, use them, without saying how (like Adobe's empty prompt with a reference).
 */
function taskFor(userPrompt, refCount = 0) {
  const p = (userPrompt || "").trim();
  if (p) return `Edit the area to change as asked: "${p}". Match the surrounding lighting, perspective, colour, grain and focus so it blends in naturally.`;
  if (refCount > 0) return `Edit the area to change using the reference image${refCount > 1 ? "s" : ""}. Match the surrounding lighting, perspective, colour, grain and focus.`;
  return "Fill the area to change so it continues the surrounding image seamlessly: if something is there, remove it and rebuild what was behind it; if the area is empty, extend the scene into it. Do not add new objects, people, text or logos.";
}

/**
 * When the whole photograph goes along (reduced) so the model can judge scale, light and perspective
 * (roadmap 3.3). `which` names it: "Image 3", or "The second image" at OpenAI.
 */
function sceneNote(which) {
  return `${which} is the whole photograph, reduced, showing where this area sits: use it only to judge scale, light and perspective. Do not edit it or return it. `;
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth"];

/** "a", "a and b", "a, b and c". */
const and = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/**
 * Names the user's reference images by their place among the images sent, since nothing else ties an
 * image to the text: the prompt calls them "ref 1", "ref 2" (their numbers in the panel).
 * @param {number[]} numbers  the references' numbers, in the order they are sent
 * @param {number} first      position of the first reference among the images
 * @param {boolean} [ordinal] "The third image" (OpenAI's wording) instead of "Image 3"
 */
function refsNote(numbers, first, ordinal) {
  if (!numbers || !numbers.length) return "";
  const pos = numbers.map((_, i) => first + i);
  if (numbers.length === 1) {
    const which = ordinal ? `The ${ORDINALS[pos[0]]} image` : `Image ${pos[0]}`;
    return `${which} is a reference image supplied by the user, called ref ${numbers[0]} or "the reference" in the request. `;
  }
  const which = ordinal ? `The ${and(pos.map((p) => ORDINALS[p]))} images` : `Images ${and(pos.map(String))}`;
  return `${which} are reference images supplied by the user, called ${and(numbers.map((n) => `ref ${n}`))} in the request. `;
}

/**
 * The whole instruction for APIs without a mask parameter (OpenRouter, Gemini): the mask goes as a
 * second image, white = change. `scene`: the whole photo follows as image 3; then the references.
 */
function maskImagePrompt(task, scene, refNumbers = []) {
  const count = 2 + (scene ? 1 : 0) + refNumbers.length;
  return (
    (count === 2 ? "You are given two images of the same size. " : `You are given ${WORDS[count]} images; images 1 and 2 have the same size. `) +
    "Image 1 is a picture. Image 2 is a mask: white marks the area to change, black marks the area to keep. " +
    (scene ? sceneNote("Image 3") : "") +
    refsNote(refNumbers, scene ? 4 : 3) +
    task +
    " Change only the white area of image 1. Keep every black area identical, with the same framing, size, perspective and lighting. " +
    "Return the full edited image 1 only: no mask, borders, text or watermarks."
  );
}

/** The whole instruction for OpenAI, whose mask is a real parameter (transparent = change). */
function alphaMaskPrompt(task, scene, refNumbers = []) {
  return (
    "Edit only the transparent area of the mask on the first image. " +
    (scene ? sceneNote("The second image") : "") +
    refsNote(refNumbers, scene ? 3 : 2, true) +
    task +
    " Keep everything outside that area unchanged, with the same framing, perspective and lighting. No borders, text or watermarks."
  );
}

module.exports = { taskFor, sceneNote, refsNote, maskImagePrompt, alphaMaskPrompt };
