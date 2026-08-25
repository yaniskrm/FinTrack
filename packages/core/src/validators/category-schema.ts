import { z } from "zod";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Shared category input schema — used by the client form (React Hook Form
 * resolver) AND server-side validation. Categories are workspace-scoped and
 * user-editable (name/icon/color); deleting one is never offered from the
 * UI — see `hidden` instead, which keeps existing transactions' category_id
 * intact.
 */
export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(50, "Nom trop long (50 max)"),
  icon: z.string().trim().min(1, "Icône requise").max(8, "Icône invalide"),
  color: z.string().regex(HEX_COLOR_RE, "Couleur invalide (format #RRGGBB)"),
});

export type CategoryFormValues = z.infer<typeof categoryInputSchema>;
