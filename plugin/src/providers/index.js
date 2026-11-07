// Provider registry. To add a model provider, write one adapter with the same shape as openai.js and list it here.

const openrouter = require("./openrouter");
const openai = require("./openai");
const gemini = require("./gemini");

// OpenRouter first: one account for every model, the path recommended to newcomers.
const PROVIDERS = [openrouter, gemini, openai];

function getProvider(id) {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

module.exports = { PROVIDERS, getProvider };
