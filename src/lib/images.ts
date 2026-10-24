/**
 * IMAGE REGISTRY — every photo on the site is a named "slot".
 *
 * How images get resolved:
 *  1. Put raw photos in /raw-photos (never committed), named after the slot, e.g. hero-1.jpg
 *  2. Run `npm run photos`  -> compresses to /public/photos/<slot>.webp (B&W-ready, max 1600px, ~80-150 KB)
 *  3. Refresh. The slot fills itself. Until then the slot shows a hatched placeholder with its name.
 *  4. Press "I" (or tap "Image slots" bottom-left) to outline every slot and see its filename.
 *
 * SAFEGUARDING (doc section 16 + CLAUDE.md rule 9): adult volunteers only. Never an identifiable
 * child or survivor. Every person photographed needs a consent record — log it in docs/photo-consent.csv.
 */
export type Slot = {
  id: string;
  ratio: string; // CSS aspect-ratio
  where: string; // where it appears on the site
  brief: string; // what the photographer / editor should supply
  duotone?: boolean; // orange duotone (featured photos only)
};

export const SLOTS: Record<string, Slot> = {
  "hero-1": { id: "hero-1", ratio: "3/2", where: "Home hero — inside the letters of ACTION", brief: "Volunteers mid-outreach, wide, high contrast. People filling the frame." },
  "hero-2": { id: "hero-2", ratio: "3/2", where: "Home hero — inside ACTION (rotates)", brief: "A training or workshop, hands raised or writing." },
  "hero-3": { id: "hero-3", ratio: "3/2", where: "Home hero — inside ACTION (rotates)", brief: "Campaign walk / placards / crowd. Adults only." },
  "hero-feature": { id: "hero-feature", ratio: "4/5", where: "Home hero — photo under the 'Become a volunteer' ticket", brief: "One strong portrait of a volunteer in a Devatop shirt. Orange duotone.", duotone: true },
  "map-fill": { id: "map-fill", ratio: "1/1", where: "Nigeria map — photo that shows through the states", brief: "A busy group shot or collage. Gets cropped inside the map shape." },
  "call-1": { id: "call-1", ratio: "4/3", where: "Calls board — featured call", brief: "Field outreach in action." },
  "story-1": { id: "story-1", ratio: "4/5", where: "Stories — volunteer testimonial", brief: "Portrait of a volunteer who agreed to be quoted." },
  "story-2": { id: "story-2", ratio: "4/5", where: "Stories — volunteer testimonial", brief: "Portrait, different state." },
  "story-3": { id: "story-3", ratio: "4/5", where: "Stories — volunteer testimonial", brief: "Portrait, remote / comms volunteer." },
  "about-1": { id: "about-1", ratio: "16/9", where: "About page — top banner", brief: "Wide shot of the Devatop team and volunteers together." },
  "about-2": { id: "about-2", ratio: "4/3", where: "About page — story section", brief: "A training session with adult participants." },
  "apply-side": { id: "apply-side", ratio: "4/5", where: "Apply page — beside the big question", brief: "Volunteers working together. Optional, shown on desktop." },
  "profile-me": { id: "profile-me", ratio: "1/1", where: "Volunteer dashboard — their own photo inside 'YOU'RE IN'", brief: "Uploaded by the volunteer. Square crop." },
};

export const photoSrc = (id: string) => `/photos/${id}.webp`;
