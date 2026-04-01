/**
 * Shared copy for the “new goals → build a new stack” flow and paid upgrade paths.
 * Keeps pricing claims aligned (Basic $9/mo, Pro $19/mo on PricingPage).
 */

export const BASIC_PRICE_LABEL = '$9';
export const PRO_PRICE_LABEL = '$19';

/** Short headline for cards and banners. */
export const REBUILD_HEADLINE = 'New goals? Build a new stack anytime';

/** Core value: cost vs one supplement + intentional spend. */
export const REBUILD_SAVINGS_BODY =
  `Basic starts at ${BASIC_PRICE_LABEL}/month, less than most single supplement bottles. ` +
  'That gives you unlimited stack rebuilds when priorities change, plus clear reasoning so you shop with intention and waste less over time.';

/** Tighter variant for narrow banners. */
export const REBUILD_SAVINGS_TEASER =
  `From ${BASIC_PRICE_LABEL}/mo, less than one typical bottle, rebuild whenever goals shift and buy supplements on purpose, not by accident.`;

/** Quiz / gate context: user already has a stack. */
export const REBUILD_GATE_BODY =
  `You already have a stack. Fresh plans for new goals are included with Basic or Pro (${BASIC_PRICE_LABEL}-${PRO_PRICE_LABEL}/mo, less than most single bottles). ` +
  'You can keep exploring. Upgrading lets you replace your plan with intention, so later supplement spend goes toward what fits.';

/** Shown when a free user tries to submit a replacement stack from the quiz. */
export const REBUILD_SUBMIT_ERROR =
  `Basic or Pro unlocks a new stack when your goals change (${BASIC_PRICE_LABEL}-${PRO_PRICE_LABEL}/mo, less than many single products). Upgrade to archive your current plan and rebuild with clear reasoning and a smarter buying roadmap.`;

/** Paid users: short reminder (archive behavior). */
export const REBUILD_PAID_REMINDER =
  'Run the quiz again whenever priorities shift. Your previous stack stays archived on this device before the new one replaces it.';

/** CTA label for free users heading to pricing with rebuild intent. */
export const REBUILD_UPGRADE_CTA = `Unlock clearer rebuilds, from ${BASIC_PRICE_LABEL}/mo`;
