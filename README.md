# Neenja Docs Tool

Neenja is a tool that allows you to automatically generate project documentation, a project plan, and a task tree using any AI coding agent, with automatic updates whenever changes are made.

<img src="https://mesonwarrior.github.io/neenja-docs/neenja_image.png" alt="Neenja" style="width: 100%">

## Example
[Neenja Documentation page](https://mesonwarrior.github.io/neenja-docs/)

<img src="https://mesonwarrior.github.io/neenja-docs/doc_screen.png" alt="Neenja" style="width: 100%">

## How to use?
1. Run `npx skills add MesonWarrior/Neenja --all`.
2. Use `/neenja-init` at the beginning of a project when you want an agent
   to turn your detailed brief into `./.neenja/project-plan.md` and
   `./.neenja/task-tree.yaml`.
3. Use `/neenja-bootstrap` once to inspect the repository and create
   `./.neenja/documentation.md`. You can pass one optional single-line
   preferences string, and the agent should save it in frontmatter as
   `preferences:` directly under `summary:`.
4. Run `npx neenja serve` to open the UI for the `.neenja/` documents folder.
   By default it shows the full docs set, including internal concepts, and
   exposes project plan or task tree tabs when those files exist.
5. Run `npx neenja build` to generate a static reader bundle into
   `.neenja/build`. By default it builds only the public documentation subset.

You can also point the UI and build commands to a custom documents folder:

```bash
npx neenja serve --dir ./some/other/.neenja
npx neenja build --dir ./some/other/.neenja
```

The reader recognizes `documentation.md`, `project-plan.md`, and
`task-tree.yaml` inside the documents folder. The legacy `--file` flag still
works for older single-file documentation setups.

By default, `build` only builds public concepts, and `serve` shows both public and private ones, but you can change the display of private concepts using --public to --private:

```bash
npx neenja serve --public
npx neenja build --private
```

## GitHub pages build
To build a GitHub Pages-ready bundle into `.neenja/build`, pass the site URL
and base path as CLI parameters:

```bash
npx neenja build-github --domain https://your_name.github.io --page /your_repo/
```

## Made with
Codex + Claude sonnet for UI + My hands
