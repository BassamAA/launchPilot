export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function buildSiteSlug(name: string, fallbackUrl?: string) {
  const base = slugify(name) || slugify(fallbackUrl || "") || "site";
  return base.slice(0, 48);
}

export function buildPostSlug(title: string) {
  const base = slugify(title) || "post";
  return base.slice(0, 64);
}
