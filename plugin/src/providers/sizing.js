// Size choice shared by providers that work in aspect ratios and size tiers (OpenRouter, Gemini).

const TIER_ORDER = ["1K", "2K", "4K"];
const rank = (t) => TIER_ORDER.indexOf(t);

/** The ratio among `ratios` closest to w/h (compared in log space); `value(r)` is its width/height. */
function closestRatio(ratios, w, h, value) {
  const want = Math.log(w / h);
  let best = ratios[0];
  let bestErr = Infinity;
  for (const r of ratios) {
    const err = Math.abs(Math.log(value(r)) - want);
    if (err < bestErr) {
      bestErr = err;
      best = r;
    }
  }
  return best;
}

/**
 * A size tier among the model's `tiers`: the smallest whose image (`sizeOf(tier)`) covers w x h
 * (the tile is never enlarged on placement), up to `maxTier`; exactly `maxTier` with { exact: true }
 * when the model offers it; never below `minTier` when the model has it (Auto's 2K floor:
 * generated pixels hold less detail than a camera's, so a tile asked bigger and shrunk on placement
 * looks as sharp as the photo). When none covers, the largest allowed.
 */
function chooseTier(tiers, w, h, maxTier, { exact = false, minTier = null } = {}, sizeOf) {
  const cap = rank(maxTier) >= 0 ? rank(maxTier) : 1;
  const allowed = tiers.filter((t) => rank(t) <= cap);
  let list = exact && tiers.includes(maxTier) ? [maxTier] : allowed.length ? allowed : [tiers[0]];
  const floor = minTier ? list.filter((t) => rank(t) >= rank(minTier)) : list;
  if (floor.length) list = floor;
  return (
    list.find((t) => {
      const s = sizeOf(t);
      return s.width >= w && s.height >= h;
    }) || list[list.length - 1]
  );
}

module.exports = { closestRatio, chooseTier, TIER_ORDER };
