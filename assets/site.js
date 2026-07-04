/* shared helpers: content indexes + tiny markdown renderer */

async function loadIndex(file) {
  const res = await fetch(file, { cache: "no-cache" });
  if (!res.ok) throw new Error("could not load " + file);
  const items = await res.json();
  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function listItem(item, base) {
  const li = document.createElement("li");
  const time = document.createElement("time");
  time.dateTime = item.date;
  time.textContent = item.date;
  const body = document.createElement("div");
  const a = document.createElement("a");
  a.href = base + "?p=" + encodeURIComponent(item.slug);
  a.textContent = item.title;
  body.appendChild(a);
  if (item.summary) {
    const p = document.createElement("p");
    p.className = "summary";
    p.textContent = item.summary;
    body.appendChild(p);
  }
  li.append(time, body);
  return li;
}

async function renderList(el, { index = "posts/posts.json", base = "post.html", limit } = {}) {
  if (location.protocol === "file:") {
    el.innerHTML =
      "<li class='empty-note'>browsers block loading content from file:// — " +
      "preview with a local server (<code>python3 -m http.server</code> in the site folder, " +
      "then open <code>http://localhost:8000</code>) or publish to GitHub Pages.</li>";
    return;
  }
  try {
    let items = await loadIndex(index);
    if (limit) items = items.slice(0, limit);
    el.innerHTML = "";
    if (items.length === 0) {
      el.innerHTML = "<li class='empty-note'>nothing here yet — soon!</li>";
      return;
    }
    items.forEach((item) => el.appendChild(listItem(item, base)));
  } catch (e) {
    el.innerHTML = "<li class='empty-note'>couldn't load content.</li>";
  }
}

/* --- minimal markdown → html (headings, emphasis, code, links, lists, quotes, images) --- */

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s) {
  return s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>")
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, "$1<em>$2</em>");
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let list = null; // "ul" | "ol"
  let inCode = false;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      out.push("<p>" + inlineMd(para.join(" ")) + "</p>");
      para = [];
    }
  };
  const closeList = () => {
    if (list) { out.push("</" + list + ">"); list = null; }
  };

  for (const raw of lines) {
    const line = raw;

    if (line.trim().startsWith("```")) {
      flushPara(); closeList();
      if (!inCode) { out.push("<pre><code>"); inCode = true; }
      else { out.push("</code></pre>"); inCode = false; }
      continue;
    }
    if (inCode) { out.push(escapeHtml(line)); continue; }

    const esc = escapeHtml(line);
    const h = esc.match(/^(#{1,4})\s+(.*)/);
    const ul = esc.match(/^\s*[-*]\s+(.*)/);
    const ol = esc.match(/^\s*\d+[.)]\s+(.*)/);
    const bq = esc.match(/^>\s?(.*)/);

    if (h) {
      flushPara(); closeList();
      const lvl = h[1].length + 1; // # → h2 inside a post
      out.push(`<h${lvl}>` + inlineMd(h[2]) + `</h${lvl}>`);
    } else if (ul) {
      flushPara();
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push("<li>" + inlineMd(ul[1]) + "</li>");
    } else if (ol) {
      flushPara();
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push("<li>" + inlineMd(ol[1]) + "</li>");
    } else if (bq) {
      flushPara(); closeList();
      out.push("<blockquote><p>" + inlineMd(bq[1]) + "</p></blockquote>");
    } else if (esc.trim() === "") {
      flushPara(); closeList();
    } else {
      closeList();
      para.push(esc);
    }
  }
  flushPara(); closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

/* --- article page loader (post.html / project.html) --- */

async function renderArticle({ index, dir, backHref }) {
  const slug = new URLSearchParams(location.search).get("p");
  const title = document.getElementById("article-title");
  const date = document.getElementById("article-date");
  const body = document.getElementById("article-body");
  try {
    const items = await loadIndex(index);
    const item = items.find((it) => it.slug === slug);
    if (!item) throw new Error("not found");
    document.title = "annia sebold · " + item.title;
    title.textContent = item.title;
    date.dateTime = item.date;
    date.textContent = item.date;
    const res = await fetch(dir + "/" + item.slug + ".md", { cache: "no-cache" });
    if (!res.ok) throw new Error("not found");
    body.innerHTML = mdToHtml(await res.text());
  } catch (e) {
    title.textContent = "not found";
    body.innerHTML =
      "<p class='empty-note'>this page doesn't exist (yet). <a href='" +
      backHref + "'>go back</a>.</p>";
  }
}
