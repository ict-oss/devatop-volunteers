/**
 * The exact wording of every consent, with its version (rule 8). The SERVER copies this text into the `consents` table,
 * so what is stored is always what was shown, and a browser can never send its own wording.
 * Changing a sentence means a NEW version id: old rows keep the old text.
 */
export type ConsentKey = "conduct" | "safeguarding" | "privacy" | "media";
export const CONSENT_KIND = { conduct: "code_of_conduct", safeguarding: "safeguarding", privacy: "privacy", media: "photo_media" } as const;

export const CONSENTS: { key: ConsentKey; version: string; required: boolean; text: string }[] = [
  { key: "conduct", version: "conduct-v1", required: true, text: "I have read and agree to the Code of Conduct." },
  { key: "safeguarding", version: "safeguarding-v1", required: true, text: "I have read and agree to the Safeguarding Agreement. I understand I will not work with children or survivors until I have completed safeguarding training." },
  { key: "privacy", version: "privacy-v1", required: true, text: "I have read the Privacy Notice and I consent to Devatop using my details to run the volunteer programme. I know I can withdraw consent at any time from my dashboard." },
  { key: "media", version: "media-v1", required: false, text: "Optional: Devatop may photograph or film me at activities and use the images to show its work." },
];
export const REQUIRED_CONSENTS = CONSENTS.filter((c) => c.required).map((c) => c.key);
