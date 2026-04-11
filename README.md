# Neenja Docs Tool

Neenja is a tool that allows you to automatically generate a project documentation file using any AI coding agent, with automatic updates whenever changes are made.

<img src="https://mesonwarrior.github.io/neenja-docs/neenja_image.png" alt="Neenja" style="width: 100%">

## Example
[Neenja Documentation page](https://mesonwarrior.github.io/neenja-docs/)

## How to use?
1. Run `neenja init` in the target project.
2. Open `.neenja/prompts/bootstrap.md` and give it to your agent once.
3. The agent creates `./neenja.knowledge.md` in the project root.
4. Use `.neenja/prompts/system.md` as the ongoing system prompt.
5. Run `neenja serve` to open the UI for the knowledge file.
6. Run `neenja build` to generate a static reader bundle into `.neenja/build`.

You can also point the UI and build commands to a custom file:

```bash
neenja serve --file ./some/other/path.md
neenja build --file ./some/other/path.md
```

## GitHub pages build
To build a GitHub Pages-ready bundle into `.neenja/build`, pass the site URL
and base path as CLI parameters:

```bash
neenja build-github --domain https://your_name.github.io --page /your_repo/
```

## Made with
Codex + Claude sonnet for UI + My hands
