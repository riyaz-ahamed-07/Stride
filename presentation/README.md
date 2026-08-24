# Stride First Review Presentation

Interactive, keyboard-driven presentation for Stride's academic review.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal.

## Presentation controls

- `Right Arrow`, `Down Arrow`, `Page Down`, or `Space`: next slide
- `Left Arrow`, `Up Arrow`, or `Page Up`: previous slide
- `Home` / `End`: first / final slide
- `N`: toggle presenter notes
- `F`: enter fullscreen

## Slide outline

1. Title
2. Problem statement
3. Proposed solution
4. Core experience and features
5. AI workflow and safety boundaries
6. System architecture (overview)
7. **Use case diagram**
8. **Activity diagram**
9. **Class diagram**
10. **ER diagram**
11. **Architecture diagram**
12. **Module description**
13. **DB schema** (placeholder — add image when ready)
14. Technology stack and feasibility
15. Roadmap

## Diagram assets

Images live in `presentation/public/diagrams/` (copied from `docs/images/`):

| File | Slide |
|------|--------|
| `01-use-case.png` | Use case |
| `02-activity.png` | Activity |
| `03-class.png` | Class |
| `04-er.png` | ER |
| `05-architecture.png` | Architecture |
| `06-module-description.png` | Module description |
| `07-db-schema.png` | DB schema |
| `08-api-doc.png` | API documentation (Swagger) |

On diagram slides:
- **Default / Fit** = whole image visible (scaled to fit the card)
- **Scroll** = pan inside the card
- **Ctrl/Cmd + scroll** = gentle zoom
- **Drag** = pan
- **+ / − / Fit** = zoom controls
