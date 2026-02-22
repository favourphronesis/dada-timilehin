const FEED_URL = "https://medium.com/feed/@itantife";
const MAX_POSTS = 6;
const CACHE_SECONDS = 1800;

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(context.request.url, { method: "GET" });
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const upstream = await fetch(FEED_URL, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    if (!upstream.ok) {
      throw new Error(`Feed request failed with status ${upstream.status}`);
    }

    const xml = await upstream.text();
    const posts = parseFeed(xml).slice(0, MAX_POSTS);

    const response = jsonResponse({ posts });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return jsonResponse(
      {
        posts: [],
        error: "Unable to fetch Medium posts right now."
      },
      200
    );
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`
    }
  });
}

function parseFeed(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return items.map((match) => {
    const item = match[1] || "";
    const title = decodeEntities(stripTags(extractTag(item, "title")));
    const link = decodeEntities(stripTags(extractTag(item, "link")));
    const pubDate = decodeEntities(stripTags(extractTag(item, "pubDate")));

    const descriptionHtml = extractTag(item, "description");
    const contentHtml = extractContentEncoded(item) || descriptionHtml;
    const excerpt = summarize(contentHtml);
    const image = extractImage(contentHtml) || extractImage(descriptionHtml);

    return {
      title,
      link,
      pubDate,
      excerpt,
      image
    };
  });
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";

  const value = match[1] || "";
  const cdataMatch = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  return cdataMatch ? cdataMatch[1] : value;
}

function extractContentEncoded(xml) {
  const match = xml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
  if (!match) return "";

  const value = match[1] || "";
  const cdataMatch = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  return cdataMatch ? cdataMatch[1] : value;
}

function extractImage(html) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? decodeEntities(match[1]) : "";
}

function summarize(html) {
  const clean = decodeEntities(stripTags(html))
    .replace(/\s+/g, " ")
    .replace(/Continue reading.*$/i, "")
    .trim();

  if (!clean) return "Read the latest post on Medium.";

  if (clean.length <= 160) return clean;
  return `${clean.slice(0, 157).trimEnd()}...`;
}

function stripTags(value) {
  return (value || "").replace(/<[^>]*>/g, " ");
}

function decodeEntities(value) {
  return (value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
