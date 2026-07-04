# annia sebold — personal site

Minimalist static site: home, resume, blog and projects. Plain HTML/CSS/JS, made for
GitHub Pages.

Posts and projects get pretty URLs (`/blog/my-post/`, `/projects/my-project/`): on every
push, a GitHub Action runs `scripts/build-pages.js`, which generates one folder per entry
in `posts.json`/`projects.json`. The old `post.html?p=slug` URLs keep working.

## Preview locally

Browsers block `fetch()` on `file://`, so the blog/projects lists only load through a server:

```bash
cd website
node scripts/build-pages.js   # optional: generates the pretty URLs locally
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish a new blog post

1. Write the post in markdown: `posts/2026-07-10-my-post-title.md`
   (name it `YYYY-MM-DD-slug.md` — the slug is the file name without `.md`)
2. Add an entry at the top of `posts/posts.json`:

```json
{
  "slug": "2026-07-10-my-post-title",
  "title": "my post title",
  "date": "2026-07-10"
}
```

3. Commit and push — the deploy workflow rebuilds and publishes the site in about a minute,
   and the post appears at `https://anniasebold.github.io/blog/2026-07-10-my-post-title/`.

## Publish a new project

Same idea with `projects/` and `projects/projects.json`. Projects also support a `"summary"`
field, shown in the projects list.

To add prints/screenshots: drop the image in `assets/img/` and reference it in the
markdown as `![what the image shows](assets/img/my-print.png)`.

Markdown supported: headings (`#`), bold/italic, links, images, inline code and
code blocks (```), bullet/numbered lists, quotes (`>`).

## Deploy to GitHub Pages (first time)

1. Create a repository named `anniasebold.github.io` on GitHub
2. In this folder:

```bash
git init
git add .
git commit -m "first version of the site"
git branch -M main
git remote add origin git@github.com:anniasebold/anniasebold.github.io.git
git push -u origin main
```

3. In the repository, go to Settings → Pages and set **Source: GitHub Actions**
   (needed so the deploy workflow can publish the generated pretty URLs)
4. The site goes live at `https://anniasebold.github.io`

Only people with push access to the repo can publish anything.
