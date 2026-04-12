# Neenja Docs Tool

Neenja is a tool that allows you to automatically generate a project documentation file using any AI coding agent, with automatic updates whenever changes are made.

<img src="https://mesonwarrior.github.io/neenja-docs/neenja_image.png" alt="Neenja" style="width: 100%">

## Example
[Neenja Documentation page](https://mesonwarrior.github.io/neenja-docs/)

## How to use?
1. Run `npx neenja init` in the target project.
2. Open `.neenja/prompts/bootstrap.md`, optionally change user-editable part of the prompt and give it to your agent once.
3. The agent creates `./neenja.knowledge.md` in the project root.
4. Optionally change user-editable part of the `.neenja/prompts/system.md` prompt and use as the ongoing system prompt.
5. Run `npx neenja serve` to open the UI for the knowledge file. By default it
   shows the full docs set, including internal concepts.
6. Run `npx neenja build` to generate a static reader bundle into
   `.neenja/build`. By default it builds only the public documentation subset.

You can also point the UI and build commands to a custom file:

```bash
npx neenja serve -f ./some/other/neenja.knowledge.md
npx neenja build -f ./some/other/neenja.knowledge.md
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
