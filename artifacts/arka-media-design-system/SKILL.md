---
name: arka-media-design-system
description: Visual language extracted from ARKA OS for Arka Digital Media operational products.
---

# Arka Media Design System

This system is extracted from the ARKA OS interface in
`artifacts/arka-os`. It is an operational SaaS language built around
ownership, presence, deadlines, review, and founder visibility.

## Visual character

- Use a near-black navigation and command surface to create focus.
- Use warm gold for primary actions, active navigation, attention states, and
  the moments that need to feel unmistakably Arka.
- Use ivory workspace surfaces rather than pure white for a calmer operational
  canvas.
- Keep borders muted and structural; elevation is subtle and should not make
  dense operational data feel ornamental.
- Use compact uppercase labels with generous tracking for metadata, then use
  strong, tight headings for decisions and page hierarchy.

## Composition rules

- Lead with the operational question or decision, not decoration.
- Keep session time, task time, presence, and leave status as separate signals.
- Use cards and rows to group related work, but preserve clear dividers in
  tables and timelines.
- Use primary gold sparingly: one dominant action or active state per context.
- Prefer a clear Founder / Manager / Team Member responsibility hierarchy over
  generic dashboard language.

## Type

DM Sans is the UI and body face. Manrope is the display companion used by the
current ARKA OS for high-emphasis headings. Space Mono is reserved for
timestamps, IDs, and compact operational metadata. Georgia remains the
portable serif fallback for editorial content.

## Source notes

The source did not contain a standalone design specification or documented
component library. Tokens and usage notes were extracted from
`artifacts/arka-os/src/index.css`, the reusable UI primitives under
`artifacts/arka-os/src/components/ui/`, and the compositions in
`artifacts/arka-os/src/App.tsx`.
