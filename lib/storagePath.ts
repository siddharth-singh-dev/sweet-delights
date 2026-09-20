import { CAKE_IMAGES_BUCKET } from "./constants";

// Supabase public URLs look like:
// https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
// We need the <path> part back so we can delete the old file when an
// admin replaces or removes a cake photo.
export function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${CAKE_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "style"
  );
}
