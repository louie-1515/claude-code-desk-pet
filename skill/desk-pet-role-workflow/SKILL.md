---
name: desk-pet-role-workflow
description: Use when creating, adding, replacing, or polishing desk pet roles for the Claude Code desk pet project, especially when the user describes a role and expects the agent to generate prompts and guide the whole workflow.
---

# Desk Pet Role Workflow

## Overview

This skill standardizes how to work on the Claude Code desk pet project.

The user should describe the role in natural language. The agent is responsible for turning that description into a usable image prompt, guiding image generation, organizing role assets, and wiring the role into the project.

## Project Root

Do not hardcode a machine-specific path.

First locate the current desk pet project root by finding the repository that contains all of these files:

- `README.md`
- `PROMPT_TEMPLATE.md`
- `pet-app/pet-registry.js`

Use that repository root as the desk pet project root for the rest of the task.

## Always Read First

Before acting, read these files from the current project root:

1. `README.md`
2. `PROMPT_TEMPLATE.md`
3. `pet-app/pet-registry.js`

Read additional files only when needed by the task.

## Core Rules

- The user describes the role; the agent writes the final prompt.
- Do not ask the user to manually edit prompt placeholders.
- Keep the sprite sheet structure fixed at `8 columns x 9 rows`.
- Keep the fixed row mapping defined in the README and `PROMPT_TEMPLATE.md`.
- New role assets belong in `assets/pets/<pet-id>/`.
- A new switchable role must also be registered in `pet-app/pet-registry.js`.
- If the task affects launch icons, check `launcher/Claude 桌宠.ico` and the registry entry's `trayIconFile`.

## Standard Workflows

### 1. Create a New Role From Description

Use this when the user says things like "创建桌宠", "做个新形象", "新增一个角色", or describes a new pet concept.

Steps:

1. Read the project files listed above.
2. Summarize the role concept back in concise production terms: name, silhouette, palette, personality, and style.
3. Generate the final image prompt from `PROMPT_TEMPLATE.md`.
4. If Codex can generate the image directly, do so. Otherwise guide the user to generate from the prompt and bring the result back.
5. Validate the returned sheet against the required row order and consistent scale.
6. Create or update:
   - `assets/pets/<pet-id>/spritesheet.png`
   - `assets/pets/<pet-id>/pet.json`
7. Register the role in `pet-app/pet-registry.js` if it should be switchable.
8. Update docs only if the workflow or built-in role list changed.
9. Run relevant verification, at minimum `npm test`.

### 2. Add an Existing Role Into the Project

Use this when the user already has a finished sheet and wants it wired in.

Steps:

1. Read the project files listed above.
2. Inspect the supplied image and confirm row order, scale, and cleanup quality.
3. Organize the files under `assets/pets/<pet-id>/`.
4. Create or fix `pet.json`.
5. Register the role in `pet-app/pet-registry.js`.
6. Run relevant verification, at minimum `npm test`.

### 3. Polish or Repair an Existing Role

Use this when the user asks to fix drag directions, cleanup quality, sizing consistency, mapping, or display behavior for an already integrated role.

Steps:

1. Read the project files listed above.
2. Inspect the current selected role assets and the related renderer or registry files.
3. Identify whether the issue is in:
   - the sprite sheet,
   - `pet.json`,
   - registry wiring,
   - renderer / main-process logic,
   - or documentation.
4. Fix only the layers needed for the reported issue.
5. Run relevant verification, at minimum targeted tests plus `npm test` before claiming completion.

## Prompting Guidance

When converting a user's description into a final image prompt:

- Preserve the project's fixed animation semantics.
- Enforce consistent character scale across all rows.
- Preserve clean cutout-friendly output.
- Treat style as customizable, but do not relax structural constraints.

The user should never be handed a raw placeholder template and told to fill it in manually unless they explicitly ask for that.

## Delivery Checklist

Before finishing:

1. Confirm assets are in the correct `assets/pets/<pet-id>/` folder.
2. Confirm registry wiring if the role is meant to be selectable.
3. Confirm the README still matches the behavior if workflow changed.
4. Run verification.
5. Tell the user exactly which role folder or menu entry was added or updated.
