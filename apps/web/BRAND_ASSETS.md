# iJac Brand Assets Documentation

**Last Updated:** 2026-08-07  
**Status:** Task 4.1 Complete

## Asset Inventory

### Logos
- `public/ijac/logo.png` — Primary iJac logo (from ijac.com.ar reference)
- `public/ijac/logo-positive.png` — Positive (light) variant

### Fonts

#### SphereFez (Brand Display Font)
- `public/fonts/SphereFez-8MAzJ.ttf` — TrueType variant
- `public/fonts/SphereFez-Yz5g4.otf` — OpenType variant

**Approved for use** in brand lockups and primary headlines.  
**Fallback:** Space Grotesk (if SphereFez fails to load)

#### Inter (Body Copy)
Self-hosted via Google Fonts CDN (see task 4.2 for local hosting)

#### Space Grotesk (Headings)
Self-hosted via Google Fonts CDN (see task 4.2 for local hosting)

## Licensing & Ownership

All assets copied from the `carrizoja/ijac.com.ar-Next-js` repository are owned/licensed by iJac and approved for use in this operations application.

## Font Weight & Style Strategy

### SphereFez
- Used exclusively for the iJac brand lockup in headers
- Weight: Regular (as provided)
- Fallback: Space Grotesk 700 Bold

### Inter
- Body text, form fields, captions
- Weights: 400 (regular), 500 (medium, UI elements)
- Optimized for readability at small sizes

### Space Grotesk
- Page titles, section headings, emphasis
- Weights: 400 (regular), 600 (bold)

## Implementation Status

- [x] Logo files copied to `public/ijac/`
- [x] SphereFez fonts copied to `public/fonts/`
- [ ] CSS `@font-face` declarations (task 4.2)
- [ ] Tailwind font family aliases (task 4.2)
- [ ] Typography conventions defined (task 4.4)
