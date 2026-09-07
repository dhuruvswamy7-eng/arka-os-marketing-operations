# Source component map

The ARKA OS source contains a reusable shadcn-style primitive set under
`artifacts/arka-os/src/components/ui/`, plus product-specific compositions in
`src/App.tsx`. The design system keeps the product compositions in the app and
the product-agnostic primitives in this package.

## Source-backed pilot

| Family | Source evidence | Status |
| --- | --- | --- |
| Button | `src/App.tsx` `Button`; `src/components/ui/button.tsx` | Implemented |
| Badge | `src/App.tsx` `Badge`; `src/components/ui/badge.tsx` | Implemented |
| Card | `src/App.tsx` `Card`; `src/components/ui/card.tsx` | Implemented |
| Input / Field | `src/App.tsx` `Field`; `src/components/ui/input.tsx`, `field.tsx` | Implemented |
| Navigation / Sidebar | `src/App.tsx` `Shell`; `src/components/ui/sidebar.tsx` | Implemented |

## Remaining reusable families

The source scaffold also ships Accordion, Alert, Alert Dialog, Aspect Ratio,
Avatar, Breadcrumb, Button Group, Calendar, Carousel, Chart, Checkbox,
Collapsible, Command, Context Menu, Dialog, Drawer, Dropdown Menu, Empty,
Form, Hover Card, Input Group, Input OTP, Item, Kbd, Label, Menubar,
Navigation Menu, Pagination, Popover, Progress, Radio Group, Resizable,
Scroll Area, Select, Separator, Sheet, Skeleton, Slider, Sonner, Spinner,
Switch, Table, Tabs, Textarea, Toast, Toggle, Toggle Group, and Tooltip.
These remain available as themed package primitives. Application-specific
attendance, leave, work, and role compositions stay in ARKA OS.
