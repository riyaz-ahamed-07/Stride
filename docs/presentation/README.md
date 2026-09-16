# Stride presentation

Interactive, keyboard-driven slide deck for project walkthroughs.

## Run locally

```bash
cd docs/presentation
npm install
npm run dev
```

Open the local URL printed in the terminal.

## Controls

- `Right Arrow`, `Down Arrow`, `Page Down`, or `Space`: next slide
- `Left Arrow`, `Up Arrow`, or `Page Up`: previous slide
- `Home` / `End`: first / final slide
- `N`: toggle presenter notes
- `F`: fullscreen

## Diagram assets

Images live in `docs/presentation/public/diagrams/` (aligned with `docs/images/` / `docs/diagrams/`):

| File                        | Topic              |
| --------------------------- | ------------------ |
| `01-use-case.png`           | Use case           |
| `02-activity.png`           | Activity           |
| `03-class.png`              | Class              |
| `04-er.png`                 | ER                 |
| `05-architecture.png`       | Architecture       |
| `06-module-description.png` | Module description |
| `07-db-schema.png`          | DB schema          |
| `08-api-doc.png`            | API documentation  |

On diagram slides:

- **Fit** = whole image visible
- **Scroll** = pan inside the card
- **Ctrl/Cmd + scroll** = zoom
- **Drag** = pan

Project documentation: [../PROJECT_DOCUMENTATION.md](../PROJECT_DOCUMENTATION.md)
