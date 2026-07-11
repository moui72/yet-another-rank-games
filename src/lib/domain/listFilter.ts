import { z } from 'zod';
import type { ListFilter } from '$lib/types/entities';

/**
 * Runtime schema for `List.filter` (datamodel.md "List filter schema").
 * `.strict()` everywhere rejects unknown keys, so a malformed or unexpected
 * filter is refused on write rather than silently ignored (Principle II).
 */
const range = z.object({ min: z.number().nullish(), max: z.number().nullish() }).strict();
const tag = z.object({ include: z.array(z.string()), exclude: z.array(z.string()) }).strict();

export const listFilterSchema = z
	.object({
		mechanics: tag.optional(),
		categories: tag.optional(),
		weight: range.optional(),
		playingTime: range.optional(),
		yearPublished: range.optional(),
		playerCount: z.object({ supports: z.number().int() }).strict().optional(),
		ownedOnly: z.boolean().optional()
	})
	.strict();

// Compile-time guarantee that the schema stays in sync with the shared type.
type SchemaMatchesType = z.infer<typeof listFilterSchema> extends ListFilter ? true : never;
const _typeCheck: SchemaMatchesType = true;
void _typeCheck;

/** Parse and validate a filter, throwing on anything invalid. */
export function parseListFilter(input: unknown): ListFilter {
	return listFilterSchema.parse(input);
}

/** Non-throwing guard — true when `input` is a valid filter. */
export function isValidListFilter(input: unknown): boolean {
	return listFilterSchema.safeParse(input).success;
}
