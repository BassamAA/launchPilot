export function mapSitePatchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/onboarding_json|is_system_site|column .* does not exist|schema cache/i.test(message)) {
    return {
      status: 409,
      error: "Database is missing the latest Phase 7 schema changes. Run `npx supabase db push` and retry.",
    };
  }

  return {
    status: 500,
    error: "Update failed",
  };
}
