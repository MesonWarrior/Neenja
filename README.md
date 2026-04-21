# Neenja

Neenja is a vibecoding framework that creates a set of project documents, allowing you to generate a project plan, automatically maintain documentation, break project development down into tasks, and track task completion.

It provides the agent with instrumentation for understanding the project and tracking the current stage of development in order to achieve a consistent result.

<img src="https://mesonwarrior.github.io/neenja-docs/neenja_image.png" alt="Neenja" style="width: 100%">

## Docs example

[Neenja Documentations page](https://mesonwarrior.github.io/neenja-docs/)

<table width="100%">
  <tr>
    <td width="50%"><img src="https://mesonwarrior.github.io/neenja-docs/docs.png" alt="Documents"></td>
    <td width="50%"><img src="https://mesonwarrior.github.io/neenja-docs/plan.png" alt="Project plan"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://mesonwarrior.github.io/neenja-docs/tree.png" alt="Task tree"></td>
    <td width="50%"></td>
  </tr>
</table>

## How to use?

1. Run `npx skills add MesonWarrior/Neenja --all`.
2. Use the `/neenja-init` skill and describe all information about your project in detail if you are starting a project from scratch.
- OR:
Use the `/neenja-bootstrap` skill and describe all information about your project in detail if the project has already been created and is under development.
```
Note: At this stage, you can specify how exactly the agent should maintain each document (documentation.md, project-plan.md, task-tree.yaml). The agent will save this in preferences and use it when creating and updating them.
```
3. Run `npx neenja serve` to open the UI for reading the documents, and make sure to verify that everything was created correctly. Fix issues at the project plan level so they do not arise during development.
4. After you have checked everything, you can open a new chat with a clean context and ask the agent to perform specific tasks from the task tree, or to complete a task at its own discretion. Do not ask the agent to perform more than one task at a time if the tasks are substantial enough. Use a chat with a clean context for each new task.
5. Run `npx neenja build` to build a documentation reader into `.neenja/build`. By default it builds only public documentation and omits project plan and task tree data.

# Privacy concept

By default, `build` runs in public mode, while `serve` runs in private mode.
Public mode includes only public concepts from documentation. Private mode also
includes private concepts, the project plan, and the task tree:

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