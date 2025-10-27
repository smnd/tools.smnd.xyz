# Acceptance Checklist

Use this checklist to validate the QR configuration web app against the requirements. Items are grouped by functional area.

## Payload Correctness
- [ ] Builds EMVCo MPM TLV payload with correct tag ordering.
- [ ] Computes CRC-16/CCITT-FALSE correctly (poly 0x1021, init 0xFFFF, no reflect, no final XOR).
- [ ] Appends `63` with length `04` and 4-hex-digit CRC at end.
- [ ] Lengths reflect UTF-8 byte counts for all values.
- [ ] Preserves user-defined order across root tags, `62` sub-tags, and each scheme’s sub-tags.
- [ ] Blocks export when payload fails validation; shows clear error messages.

## Presets
- [ ] SGQR/PayNow preset loads with suggested fields and AID; remains fully editable.
- [ ] DuitNow preset loads with suggested fields and AID; remains fully editable.
- [ ] UPI preset loads with suggested fields and AID; remains fully editable.
- [ ] At least one MAI (26–51) required for these presets.

## Dynamic Scheme & Tags
- [ ] User can add a new scheme with container tag (26–51).
- [ ] Editor requires AID sub-tag `00` within each scheme.
- [ ] User can add/remove/reorder sub-tags (00–99); order reflected in payload.
- [ ] User can duplicate a scheme entry.

## Common & Additional Data
- [ ] Common tags (`52`, `53`, `54`, `58`, `59`, `60`, etc.) configurable with format validation.
- [ ] Additional Data Template (62) supports ordered, user-defined sub-tags.

## Preview & Export
- [ ] Live QR image updates within 100 ms of valid changes.
- [ ] Shows payload text and computed CRC; copy-to-clipboard works.
- [ ] PNG export works at configurable size and colors.
- [ ] SVG export works and sanitizes embedded text.
- [ ] Web Share API used when available; download fallback works otherwise.

## Persistence & Interop
- [ ] Autosaves last configuration to localStorage and restores on reload.
- [ ] Exports/imports configuration JSON conforming to `docs/schema/config.schema.json`.
- [ ] "Reset to preset defaults" restores initial preset state.

## Responsive UX
- [ ] Desktop: two-column layout with editor on left, preview on right.
- [ ] Mobile: stacked layout; QR preview remains visible above the fold.
- [ ] Left panel can collapse/expand; sticky preview header on mobile works.

## Accessibility
- [ ] Full keyboard navigation; focus-visible outlines on interactive elements.
- [ ] Proper labels/ARIA for dynamic lists and controls.
- [ ] Colors meet WCAG AA contrast ratios.

## Security & Privacy
- [ ] No network calls are made; all computation is local.
- [ ] No sensitive data prompts; SVG/text outputs are sanitized against injection.

## Performance
- [ ] Live rebuild limited to relevant changes; avoids unnecessary recompute.
- [ ] PNG export ≤ 200 ms at 1024×1024 on a typical device.

## Testing
- [ ] Unit tests cover TLV build, length/format validation, and CRC with known vectors.
- [ ] E2E test: preset → edit → valid payload → image export passes.
- [ ] E2E test: create custom scheme/tags and verify payload order.
- [ ] E2E test: mobile viewport layout and export buttons.

