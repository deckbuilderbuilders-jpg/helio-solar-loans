# Update /welcome headline and subheadline

## Change
On the /welcome splash page hero, replace the current headline and subheadline with the new copy:

- H1: **Fund Solar. Earn Yield** (keep "Earn Yield" in the orange accent, consistent with the splash brand rule)
- Subheadline: "Utility company returns your principal in 120 days. You keep a tradable Yield NFT paying quarterly for six years."

Also align the page's `<title>` and meta/OG description with the new headline wording so the page metadata no longer references the old "Lend $1. Get $1 back" framing.

## Scope
- File: `src/routes/welcome.tsx` only (hero H1 at ~lines 191–193, subheadline at ~lines 194–197, head metadata at lines 43–59).
- No other pages, components, logic, or styling changes.

## Verification
- Check build log for errors after the edit.
- Load /welcome in the browser and confirm the new headline and subheadline render on desktop and mobile.
