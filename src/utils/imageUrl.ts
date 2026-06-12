export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Already a full URL
  if (path.startsWith('data:image')) return path; // Base64 image

  // Bilder kommen vom selben Server wie die App – relativer Pfad reicht
  return path.startsWith('/') ? path : `/${path}`;
};
