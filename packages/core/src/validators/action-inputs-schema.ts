import { z } from "zod";
import { accountInputSchema } from "./account-schema.js";
import { currencySchema } from "./transaction-schema.js";

/**
 * Server-side input schemas for Server Actions that take loose primitives
 * (a string, a couple of ids) rather than a form object. A Server Action is a
 * public POST endpoint — TypeScript types on its signature are erased at
 * runtime, so anything reaching it must be re-validated here.
 */

/** Default currency ("mode pays") — same enum as every transaction. */
export const defaultCurrencySchema = currencySchema;

/** Row ids (bank_connections, accounts…) are Postgres-generated uuids. */
export const rowIdSchema = z.uuid();

/** ISO 3166-1 alpha-2, upper-case — as expected by Enable Banking's `country`. */
export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, "Code pays invalide");

/** ASPSP (bank) name as returned by Enable Banking — opaque, bounded text. */
export const aspspNameSchema = z.string().trim().min(1, "Banque requise").max(100, "Nom de banque trop long");

/** Name of an account created from a bank connection — same rule as the account form. */
export const connectionAccountNameSchema = accountInputSchema.shape.name;

const MAX_PUSH_FIELD_LENGTH = 512;

/**
 * Web Push subscription as produced by `PushSubscription.toJSON()`. Push
 * services only ever hand out https endpoints; keys are base64url strings.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .url("Endpoint invalide")
    .max(2048, "Endpoint trop long")
    .refine((value) => value.startsWith("https://"), "Endpoint invalide"),
  keys: z.object({
    p256dh: z
      .string()
      .min(1)
      .max(MAX_PUSH_FIELD_LENGTH)
      .regex(/^[A-Za-z0-9_-]+={0,2}$/, "Clé invalide"),
    auth: z
      .string()
      .min(1)
      .max(MAX_PUSH_FIELD_LENGTH)
      .regex(/^[A-Za-z0-9_-]+={0,2}$/, "Clé invalide"),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushEndpointSchema = pushSubscriptionSchema.shape.endpoint;
