const imageCache = new Map();

/** Find a Wikipedia lead image for a short tutor-selected concept. */
export async function findLessonImage(query, signal) {
  const normalized = String(query || "").trim().slice(0, 100);
  if (!normalized) return null;
  const cacheKey = normalized.toLowerCase();
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: normalized,
    gsrnamespace: "0",
    gsrlimit: "6",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "760",
    redirects: "1",
    format: "json",
    origin: "*",
  });
  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?${params}`,
    { signal, headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("Image search failed");
  const payload = await response.json();
  const pages = Object.values(payload?.query?.pages || {}).sort(
    (a, b) => (a.index || 0) - (b.index || 0)
  );
  const page = pages.find((item) => /^https:\/\//i.test(item?.thumbnail?.source || ""));
  const result = page
    ? {
        src: page.thumbnail.source,
        title: page.title,
        href: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      }
    : null;
  imageCache.set(cacheKey, result);
  return result;
}
