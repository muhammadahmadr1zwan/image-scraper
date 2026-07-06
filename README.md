# image-scraper

Node.js CLI for downloading high-resolution location photos from legitimate sources.

No HTML scraping of Google Reviews or Maps pages. Photos come from:

- **Google Maps share links** - direct `lh3.googleusercontent.com` URLs embedded in the link
- **Manual overrides** - drop a file in `overrides/`
- **Instagram** - public media endpoint from a permalink
- **Google Places API (New)** - official photo endpoint (optional fallback)

Requires **Node.js 18+**. Uses built-in `fetch` - no `npm install` needed.

---

## Install

```bash
git clone https://github.com/muhammadahmadr1zwan/image-scraper.git
cd image-scraper
cp .env.example .env   # optional - only needed for Places API fallback
cp cafes.example.json cafes.json   # if cafes.json is missing
```

Edit `cafes.json` with your locations:

```json
[
  {
    "id": "downtown-cafe",
    "name": "Downtown Cafe",
    "region": "us",
    "address": "123 Main St, City, ST 12345"
  }
]
```

---

## Workflow 1 - Google Maps photos (recommended)

Use this when you have a Google Maps share link for a specific photo.

### 1. Get the share link

1. Open the location on [Google Maps](https://maps.google.com).
2. Open the **Photos** tab and pick the image you want.
3. Click **Share** and copy the full URL.

The URL should contain encoded photo data (`!6shttps:%2F%2Flh3.googleusercontent.com...`) and max dimensions (`!7i6336!8i9504`).

### 2. Add it to the script

Edit `scripts/download-maps-urls.js` and add an entry to the `ENTRIES` array:

```js
{
  id: "downtown-cafe",
  url: "https://www.google.com/maps/place/..."
}
```

### 3. Download at full resolution

```bash
node scripts/download-maps-urls.js
# or
npm run maps
```

The script parses the photo URL, rebuilds it at max resolution, and saves to `overrides/{id}.jpg`.

### 4. Copy into the output folder

```bash
node index.js --cafe downtown-cafe --force
```

Writes `output/{id}.jpg` (or `.png` depending on source).

---

## Workflow 2 - Main photo fetcher

Resolves photos for every location listed in `cafes.json`.

```bash
node index.js --list
node index.js --dry-run
node index.js
node index.js --cafe downtown-cafe
node index.js --all-regions
node index.js --force
```

### Source priority

| Priority | Source | Config |
| --- | --- | --- |
| 1 | Manual override | `overrides/{id}.jpg\|png\|webp` |
| 2 | Instagram | Permalink in `sources.json` |
| 3 | Google Places API | `GOOGLE_PLACES_API_KEY` in `.env` |

### Instagram setup

```json
{
  "downtown-cafe": {
    "instagram": "https://www.instagram.com/p/XXXXXXXX/"
  }
}
```

### Google Places API (optional)

1. Create a Google Cloud project and enable **Places API (New)**.
2. Create an API key restricted to Places API (New).
3. Add it to `.env`:

```
GOOGLE_PLACES_API_KEY=your_key_here
```

---

## Project structure

```
image-scraper/
  index.js                    Main CLI
  cafes.json                  Your locations (copy from cafes.example.json)
  scripts/download-maps-urls.js   Google Maps share-link downloader
  lib/                        Fetchers and config loading
  overrides/                  Manual photos (gitignored)
  output/                     Downloaded images (gitignored)
  sources.json                Per-location Instagram / notes
  .env.example
  package.json
```

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | No | Places API fallback |
| `OUTPUT_DIR` | No | Custom output directory (default: `./output`) |

---

## CLI reference

| Flag | Description |
| --- | --- |
| `--list` | Show locations and configured sources |
| `--dry-run` | Preview without downloading |
| `--cafe <id>` | Process one location |
| `--force` | Overwrite existing output files |
| `--all-regions` | Include all regions (default: `us` only) |
| `--verbose`, `-v` | Log resolution details |
| `--help`, `-h` | Show help |

---

## Troubleshooting

**Missing cafes.json**

Copy `cafes.example.json` to `cafes.json` and add your locations.

**No lh3 URL in link**

Open the specific photo in Maps and copy a fresh share link, or set a Places API key as fallback.

**Downloaded image is tiny**

Check that the Maps URL includes `!7i{width}!8i{height}` params.