# Stride design system

Source of truth: [`shared/design-tokens.json`](../shared/design-tokens.json).

Web maps tokens in [`web/src/styles/tokens.css`](../web/src/styles/tokens.css).  
Mobile maps tokens in [`mobile/src/theme.ts`](../mobile/src/theme.ts).

## Brand

| Role            | Hex       | Use                                       |
| --------------- | --------- | ----------------------------------------- |
| Primary         | `#0058B8` | CTAs, links, focus                        |
| Primary hover   | `#007BFF` | Hover                                     |
| Primary pressed | `#004098` | Active                                    |
| Primary soft    | `#E6F4FF` | Soft fills                                |
| Accent (teal)   | `#00C6A7` | Recovery / progress accents only          |
| Text            | `#0F172A` | Primary copy                              |
| Success         | `#16A34A` | Confirmed / completed (not brand primary) |
| Info            | `#0284C7` | Informational (not purple)                |

Logo-derived blues — not the previous teal-as-primary.

## Typography

**Nunito** — Display / H1–H4 / Body Large / Body / Body Small / Label / Caption.

Patient UI uses larger body sizes; therapist/admin use denser supporting labels.

## Spacing / radius / elevation

Spacing: 4px scale (4–48).  
Radius: sm 8 · md 12 · lg 16 · xl 24 · full.  
Shadows: none · sm · md · lg (restrained).

## Icons

Lucide only (`lucide-react` / `lucide-react-native`). No emoji as icons.

## Token sync

When changing colors or type, update JSON first, then `tokens.css` and `theme.ts`.
