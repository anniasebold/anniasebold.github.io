#!/usr/bin/env node
/* generates one folder per article so pretty URLs work on GitHub Pages:
   blog/<slug>/index.html (from post.html) and projects/<slug>/index.html (from project.html).
   runs in CI on every push — see .github/workflows/deploy.yml */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function build(indexFile, shellFile, outDir) {
  const items = JSON.parse(fs.readFileSync(path.join(root, indexFile), "utf8"));
  const shell = fs.readFileSync(path.join(root, shellFile), "utf8");
  for (const item of items) {
    const page = shell
      .replace("<head>", '<head>\n<base href="/">')
      .replace(/<title>[^<]*<\/title>/, "<title>annia sebold · " + item.title + "</title>");
    const dir = path.join(root, outDir, item.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), page);
  }
  console.log(outDir + "/: " + items.length + " page(s) generated");
}

build("posts/posts.json", "post.html", "blog");
build("projects/projects.json", "project.html", "projects");
