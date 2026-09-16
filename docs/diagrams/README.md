# Stride diagram set

Figures for the bounded MVP: therapist-assigned, camera-guided rehabilitation with on-device movement analysis and therapist review. Raw camera frames are not sent to the application API or stored by default.

## Figure 1 — Use case model

![STRIDE use case model](01-use-case.png)

Patient, physiotherapist, administrator, and MediaPipe as the on-device movement-analysis engine.

## Figure 2 — Domain class model

![STRIDE domain class model](02-class-diagram.png)

Primary software objects, composition, and lifecycle relationships (application behaviour, not physical SQL alone).

## Figure 3 — Guided exercise activity

![STRIDE guided exercise activity](03-activity-diagram.png)

Consent, framing, confidence gating, local landmark processing, derived summary storage, and therapist approval.

## Figure 4 — Database ER model

![STRIDE database ER model](04-er-diagram.png)

Entities, keys, and cardinalities separating library exercises, plan items, sessions, and observations.

## Figure 5 — System architecture

![STRIDE system architecture](05-architecture.png)

Browser / API / data layers. MediaPipe executes on device; only derived metrics cross the privacy boundary.

## Overview collage

![STRIDE diagram set](00-review2-diagram-set.png)

## Formats

- PNG — reports, GitHub, slides  
- SVG — vector originals  
- Graphviz DOT under [`source/`](source/) — maintainable definitions  
- Draw.io / Mermaid sources alongside PNG/SVG where present  

Raster copies used in early decks also live under [`../images/`](../images/).

> Stride is an educational prototype, not a diagnostic system or medical device. Movement observations require physiotherapist review before becoming approved progress.
