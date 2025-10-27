# QR Configuration Web App Requirements

This document defines requirements for a client-only web app that configures and generates EMVCo-compatible payment QR payloads and images for SGQR/PayNow, DuitNow, and UPI. No backend services are used; all work happens locally in the browser.

## Scope
- Single-page web app with a split layout: left panel for configuration, right panel for live QR preview and payload.
- Support presets (SGQR/PayNow, DuitNow, UPI) and fully freeform composition with custom schemes and ordered tags.
- Export QR as PNG/SVG, copy payload text, and optionally share via Web Share API.
- Save/Load configurations locally and via JSON import/export.

## Standards & Compatibility
- Implement EMVCo Merchant-Presented Mode (MPM) payload using TLV (Tag–Length–Value).
- Root tags include: `00` Payload Format Indicator, `01` Point of Initiation, `52–60` common tags, `62` Additional Data Field Template, `63` CRC.
- Merchant Account Information (MAI) containers: tags `26–51`, each containing nested TLV with `00` AID and scheme-specific sub-tags.
- CRC-16/CCITT-FALSE: polynomial 0x1021, init 0xFFFF, no reflection, no final XOR; computed over the payload including tag `63` + length (`04`) but excluding its value.
- Preserve user-defined TLV order.

## Personas & Goals
- Payments engineer: verify payloads, scan with reference apps.
- Merchant operator: configure static/dynamic QR and export/share.
- Developer: compose, validate, and reuse configurations.

## Core User Flows
- Choose a preset or start blank.
- Add one or more payment schemes (MAI 26–51); for each, set `00` AID and ordered sub-tags.
- Configure common tags (`52` MCC, `53` currency, `54` amount, `58` country, `59` name, `60` city, etc.).
- Configure Additional Data Field Template `62` with ordered sub-tags.
- Live-generate payload, validate, render QR, export/copy/share.
- Save/load configurations (localStorage, JSON import/export).

## Configuration Panel (Left)
- Root fields:
  - `00` Payload Format Indicator: fixed "01" (not user-editable).
  - `01` Point of Initiation: select static "11" or dynamic "12".
  - Common tags: `52` MCC, `53` currency (ISO 4217), `54` amount, `55` tip/convenience, `58` country (ISO 3166-1 alpha-2), `59` merchant name, `60` city. Optional `56`, `57`, `61` as needed.
  - Additional Data Template `62`: ordered list of nested sub-tags (user-defined `id` + `value`).
- Payment schemes (MAI containers `26–51`):
  - Add/remove/reorder schemes (container tag 26–51); each has label and ordered sub-tags.
  - Sub-tag editor: `id` (00–99), `value` (string/hex), optional notes. Require `00` AID; others optional.
- Presets:
  - SGQR/PayNow, DuitNow, UPI presets provide suggested tags and validation hints; fully editable.

## Preview & Output (Right)
- Live QR image updates on valid changes.
- Show payload string with copy button and computed CRC.
- Show QR size/version and ECC level.
- Export: PNG, SVG; Share via Web Share API if available.
- Clear error state; disable export on invalid payload.

## Payload Builder
- Generic TLV composer that:
  - Preserves user-defined order at every nesting level.
  - Enforces two-digit tag IDs and correct byte lengths (UTF-8) for values.
  - Supports nested TLV for MAI (26–51) and Additional Data (62).
  - Auto-appends `63` CRC at the end and recalculates on change.
- Encoding and normalization:
  - Default to UTF-8 strings; optional hex-entry mode for specific tags.
  - Trim whitespace; validate numeric fields (e.g., `53` currency is 3 digits; `54` amount is decimal with dot; `58` is 2-letter country).
- Build order:
  1) Compose all tags except `63`.
  2) Append `63` with length `04`.
  3) Compute CRC over the entire payload up to the end of the `63` length field.
  4) Append 4-hex-digit CRC uppercase.

## Validation Rules
- Tag ID: exactly two digits per nesting level.
- Length: two-digit length equals number of bytes in value (UTF-8).
- Allowed ranges: MAI container tags 26–51; sub-tags 00–99.
- Required root tags: `00`, `01`, `63`. Presets define additional required fields as guidance.
- Currency `53`: 3-digit numeric. Country `58`: 2-letter A–Z. Amount `54`: positive decimal if present.
- Ensure at least one MAI (26–51) for SGQR/DuitNow/UPI presets.
- Strict mode: warn on duplicate tag IDs at the same level.

## Dynamic Scheme Management
- Add new scheme with container tag (26–51) and required `00` AID sub-tag.
- Add/remove/reorder sub-tags; duplicate a scheme for variations.

## Responsive Layout
- Desktop: two columns; Mobile: stacked with QR preview kept visible above the fold.
- Left panel collapsible; sticky preview header on mobile.

## QR Rendering & Export
- QR code:
  - ECC level configurable (default M), module size slider, quiet zone ≥ 4 modules.
  - Foreground/background color pickers; optional center logo with safe-area guidance.
- Export:
  - PNG (rasterized at selected size), SVG (vector), and payload text copy.
  - File names include timestamp and scheme label.
- Share:
  - Use Web Share API when available; fallback to download.

## Persistence & Interop
- Autosave last configuration to localStorage.
- Export/import configuration JSON (see schema in `docs/schema/config.schema.json`).
- "Reset to preset defaults" action.

## Accessibility & i18n
- Fully keyboard navigable, focus-visible, proper labels and ARIA for dynamic lists.
- Color contrast meets WCAG AA.
- Text copy prepared for i18n; no hard-coded strings in logic.

## Security & Privacy
- No network calls; data stays local.
- No secrets; warn users not to enter sensitive information.
- Sanitize text in SVG exports to prevent injection.

## Testing & QA
- Unit tests:
  - TLV encode/decode roundtrip for simple and nested cases.
  - CRC computation against EMVCo test vectors.
  - Validation of tag IDs, lengths, and formats.
- E2E tests:
  - Preset load → minimal edit → valid payload → exported image.
  - Dynamic scheme creation and reordering preserved in payload order.
  - Mobile viewport layout and export buttons.
- Manual validation:
  - Scan with at least two third-party apps per preset.
  - Verify CRC and payload structure with an external decoder.

## Performance
- Live preview updates within 100 ms for typical configurations.
- PNG export under 200 ms for 1024×1024.
- Efficient re-compute: rebuild payload/CRC only on relevant changes.

## Deliverables
- Web app implementing the above with:
  - Config editor, live QR preview, copy/export/share.
  - Presets for SGQR/PayNow, DuitNow, UPI (editable).
  - JSON import/export and autosave.
- Developer docs:
  - Configuration JSON schema (`docs/schema/config.schema.json`).
  - TLV/CRC rules and edge cases.
  - Known preset fields and guidance (informational; not regulatory advice).

## Out of Scope
- Backend services, merchant onboarding, KYC, PSP integrations.
- Payment verification or transaction processing.
- Certification; tool supports compatibility-oriented generation only.

## Open Questions
- Include a "decode" tab to parse payloads back into the editor?
- Opinionated presets (locked required fields) vs. freeform with warnings?
- Target devices or offline PWA requirements?

