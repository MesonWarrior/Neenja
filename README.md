# Neenja Docs Tool

Neenja is a tool that allows you to automatically generate a project documentation file using any AI coding agent, with automatic updates whenever changes are made.

<img src="./neenja_image.png" alt="Neenja" style="width: 100%">

## Example
[Neenja Documentation page](https://mesonwarrior.github.io/neenja-docs/)

## How to use?
1. Clone Neenja in your project.
2. Customize and run bootstrap prompt [`prompts/neenja-documentation-bootstrap-prompt.md`].
3. Set your agent's system prompt to this prompt: [`prompts/neenja-documentation-bootstrap-prompt.md`] or add this at the end if you're using the system prompt.
4. To see the UI, go to the Neenja folder and run:
```bash
npm install
npm run dev
```
Open `http://localhost:4321`
5. To build the UI, go to the Neenja folder and run:
```bash
npm run build
```
Then you can copy `dist/` directory to serve it with a server.

## GitHub pages build
To build the project for github pages:
1. Change `build:github-pages` script's parameters in `package.json` for your case.
2. Run:
```bash
npm run build:github-pages
```

## Made with
Codex + Claude sonnet for UI + My hands