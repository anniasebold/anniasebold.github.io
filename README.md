# annia sebold — personal site

Minimalist static site: home, resume, blog and projects. No build step, no backend —
plain HTML/CSS/JS, made for GitHub Pages.

## Preview locally

Browsers block `fetch()` on `file://`, so the blog/projects lists only load through a server:

```bash
cd website
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

3. Commit and push — GitHub Pages redeploys automatically in about a minute.

## Publish a new project

Same idea with `projects/` and `projects/projects.json`. Projects also support a `"summary"`
field, shown in the projects list.

To add prints/screenshots: drop the image in `assets/img/` and reference it in the
markdown as `![what the image shows](assets/img/my-print.png)`.

Markdown supported: headings (`#`), bold/italic, links, images, inline code and
code blocks (```), bullet/numbered lists, quotes (`>`).

## Deploy to GitHub Pages (first time)

1. Create a repository named `annia.github.io` on GitHub
2. In this folder:

```bash
git init
git add .
git commit -m "first version of the site"
git branch -M main
git remote add origin git@github.com:annia/annia.github.io.git
git push -u origin main
```

3. The site goes live at `https://annia.github.io` (Settings → Pages should
   already show "Deploy from branch: main" by default).

Only people with push access to the repo can publish anything.
