# Favicons

The app uses these favicon files from the **root** of this folder (`public/`). Browsers request them by name.

## Format guideline (desktop favicon)

**`detailops favicon new.svg`** is the reference: the **whole logo** is shown in the icon, contained and centered in a 64×64 frame with transparent background. No cropping to a part of the logo. The same format is used when generating favicons from an org’s profile logo (`/api/favicon`) and for the default icon (`/api/default-icon`).

## Right now
- **favicon.ico** – served via rewrite from `favicon.png` (same image).
- **favicon.png**, **favicon-16x16.png**, **favicon-32x32.png**, **favicon-96x96.png**, **android-icon-192x192.png** – generated from the DetailOps logo so the tab icon always works.

## To use your own favicon pack
If you generated a favicon pack (e.g. from realfavicongenerator.net or similar), copy **all** of the generated files into this folder (`public/`) with **exactly** these names:

- `favicon.ico` (or keep the rewrite and only add PNGs)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `favicon-96x96.png`
- `android-icon-192x192.png`
- `apple-icon-57x57.png`, `apple-icon-60x60.png`, `apple-icon-72x72.png`, `apple-icon-76x76.png`
- `apple-icon-114x114.png`, `apple-icon-120x120.png`, `apple-icon-144x144.png`, `apple-icon-152x152.png`, `apple-icon-180x180.png`
- `ms-icon-144x144.png`

The layout already links to all of these. Replacing the files here will switch the site to your uploaded favicons.
