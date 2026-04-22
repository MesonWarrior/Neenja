# Neenja

Neenja is a vibecoding framework that creates a set of project documents, allowing you to generate a project plan, automatically maintain documentation, break project development down into tasks, and track task completion.

It provides the agent with instrumentation for understanding the project and tracking the current stage of development in order to achieve a consistent result, while giving the user an interface to view the documentation created by the agent in a human-readable format.

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

### Setup

1. Run `npx skills add MesonWarrior/Neenja --all`.
2. Write a comprehensive description of your project in free form, covering everything from architecture to design and the technology stack, with attention to even the smallest details that matter to you.
3. Use the `/neenja-init` skill and insert the description you wrote in the previous step if you are starting a project from scratch.
- OR:
Use the `/neenja-bootstrap` skill and insert the description you wrote in the previous step if the project has already been created and is under development.
```
Note: At this stage, you can specify how exactly the agent should maintain each document (documentation.md, project-plan.md, task-tree.yaml). The agent will save this in preferences and use it when creating and updating them.
```
4. Run `npx neenja serve` to open the UI for reading the documents, and make sure to verify that everything was created correctly. Fix issues at the project plan level so they do not arise during development.

### Development

1. Open new, clean chat.
2. Use the `/neenja-sync` skill on every interaction with the agent from this point on.
3. Tell the agent to start or continue working at its own discretion, or specify the tasks that should be completed first.
4. Review the completed tasks. If there are any issues, inform the agent so they can fix them. If everything is fine, say so and it will change the tasks' status to "done".
6. Repeat until all tasks are completed.

```
Note: If needed, you can provide the agent with new information, and it will expand the project plan and create new tasks.
```

## Build

Run `npx neenja build` to build a documentation reader into `.neenja/build`. By default it builds only public documentation and omits project plan and task tree data.

## Privacy concept

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