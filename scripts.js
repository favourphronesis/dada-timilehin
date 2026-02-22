const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

function observeReveal(root = document) {
  root.querySelectorAll(".reveal, .reveal-delay").forEach((node) => observer.observe(node));
}

observeReveal();

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBlogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Medium";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function renderBlogPosts(posts) {
  return posts
    .map((post) => {
      const title = escapeHtml(post.title || "Untitled");
      const excerpt = escapeHtml(post.excerpt || "Read the latest post on Medium.");
      const link = escapeHtml(post.link || "https://medium.com/@itantife");
      const date = escapeHtml(formatBlogDate(post.pubDate));
      const image = post.image
        ? `<img class="blog-thumb" src="${escapeHtml(post.image)}" alt="${title}">`
        : "";

      return `
        <article class="blog-card reveal">
          ${image}
          <div class="blog-card-body">
            <p class="blog-meta">${date}</p>
            <h3 class="blog-title">${title}</h3>
            <p class="blog-excerpt">${excerpt}</p>
            <a class="blog-link" href="${link}" target="_blank" rel="noreferrer">Read &rarr;</a>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadBlogPosts() {
  const blogGrid = document.getElementById("blog-grid");
  if (!blogGrid) return;

  try {
    const response = await fetch("/api/blog", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Blog API error: ${response.status}`);
    }

    const data = await response.json();
    const posts = Array.isArray(data.posts) ? data.posts.slice(0, 3) : [];

    if (!posts.length) {
      throw new Error("No blog posts available");
    }

    blogGrid.innerHTML = renderBlogPosts(posts);
    observeReveal(blogGrid);
  } catch (error) {
    blogGrid.innerHTML = `
      <article class="blog-card">
        <div class="blog-card-body">
          <p class="blog-status">New posts from Medium will appear here automatically.</p>
          <a class="blog-link" href="https://medium.com/@itantife" target="_blank" rel="noreferrer">Read &rarr;</a>
        </div>
      </article>
    `;
  }
}

loadBlogPosts();
