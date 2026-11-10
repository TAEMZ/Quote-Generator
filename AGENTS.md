# Quote Generator Design & Agent Guidelines

## 1. Strict UI Design Prohibitions & Enforcement Rules (20 Anti-Slop Rules)

When designing, refactoring, or extending any UI in this project, enforce all 20 rules below:

1. **Delete filler badges**: Never place decorative pill badges next to headings or brand titles unless they convey essential, actionable state.
2. **Drop redundant labels**: Remove labels that merely repeat what surrounding context, headings, or icons already communicate clearly.
3. **Unitalicize random words**: Avoid arbitrary italic styling inside UI copy, placeholders, captions, or headings.
4. **Mono only where needed**: Reserve monospace typography strictly for code, IDs, timestamps, or numeric/tabular indices where alignment matters.
5. **Use a design system**: Use the defined CSS variables, spacing rhythm, and shared component classes in `styles/styles.css` instead of ad-hoc styles.
6. **Show the actual product**: Present the primary interactive product immediately upfront rather than hiding it behind filler marketing chrome.
7. **Enlarge the main feature**: Give the primary feature clear visual dominance over secondary navigation or supporting blocks.
8. **Group with spacing**: Use deliberate whitespace and subtle layout structure instead of defaulting to heavy bordered card boxes everywhere. Prefer transparent borders at rest that reveal borders on hover for secondary action grids when the user avoids heavy cards.
9. **Make headlines specific**: Write concrete, domain-accurate headings rather than generic filler copy.
10. **Emphasize the CTA**: Keep primary actions unmistakable through high contrast and clean hierarchy.
11. **Add an accent colour**: Apply deliberate, restrained cinema accent colors (`#e85d4a` coral, `#e5a93c` amber) without turning the UI into a rainbow or flat monochrome.
12. **Keep icons consistent**: Keep uniform stroke weights, geometry, and optical sizing across all icons and 2D SVG marks.
13. **Remove embellishments**: Strip purely decorative ornaments, arbitrary status dots, or heavy chrome that add zero usability value.
14. **Inner radius = outer - padding**: Compute concentric corner radii consistently (`inner radius = outer radius - container padding`).
15. **Improve text contrast**: Maintain accessible foreground-to-background contrast across both dark plum surfaces and archival ivory stages.
16. **Wrap headlines properly**: Use `text-wrap: balance` on display titles, `text-wrap: pretty` on subtitles, and comfortable measure limits.
17. **Align by eye, not pixels**: Apply slight optical offsets where geometric shapes (play icons, stars) visually skew off-center.
18. **Use tabular nums**: Apply `font-variant-numeric: tabular-nums` to ratings, counts, timestamps, pagination, and catalog indices.
19. **Add loading states**: Display skeletons or disabled button feedback on every asynchronous fetch or database write.
20. **Animate useful feedback**: Reserve animations for purposeful interaction cues and state transitions rather than distracting idle loops.

---

## 2. Background & Surface Depth Reference (22 Options to Make Designs Less Flat)

Avoid plain flat fills on page canvases; pick one intentional background technique suited to the aesthetic:

1. Felt texture
2. Fluted glass
3. Thermal gradients
4. Water ripples
5. Speckled graphite
6. Single-hue landscapes
7. Blueprint grids *(applied on `movies.html`)*
8. Halftone *(applied on hovered catalog cards)*
9. Grainy gradients *(layered on `movies.html` canvas)*
10. Grass texture
11. Dithered images
12. Paper texture
13. Contour lines *(applied on `index.html`)*
14. Cloud sky
15. Pixel mosaics
16. Lens distortion
17. Stippled gradients
18. Square-dot grids
19. Blurred photos
20. Iridescent shapes
21. Impressionist paintings
22. ASCII and pixels

