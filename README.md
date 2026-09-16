# Neshane

An offline image-annotation workspace for research on visual deception and multimodal reasoning. Draw regions linked to editable text, distinguish misleading evidence from helpful hints, and produce controlled dataset variants from one annotation session.

Neshane is a self-contained browser app. Open `index.html` to use it; no server, account, runtime installation, or internet connection is required for annotation.

## What it does

- Browse a dataset one image at a time while retaining edits across navigation.
- Add, edit, delete, or reclassify text entries; link **multiple boxes to the same text**.
- Draw, move, resize, reassign, and delete boxes; enter exact pixel coordinates when needed.
- Export complete datasets, including images without annotations, while retaining original metadata and editable associations.
- Download annotated or masked PNGs for individual images.
- Reopen exported data without accumulating overlays or losing excluded annotation categories.

| Category | Meaning | Appearance |
| --- | --- | --- |
| Deception | Evidence that can mislead reasoning | Red outline |
| Answer hint | A clue that supports the correct answer | Green dashed outline |
| Observation | A neutral description of what is visible | Gray outline |
| Evidence mask | A manually selected region to hide | Opaque violet fill |

Existing visual observations are **not** automatically answer hints. Reclassify an entry explicitly when appropriate. Short ID badges such as D1 or H1 are never printed on boxes or exported images; stable identifiers remain in the data.

## Quick start

1. Download or clone this repository and open `index.html` in a recent Chrome or Edge browser.
2. Choose **Open dataset ZIP**, **Open dataset folder**, **Import JSON**, or **Add images**. **Try a sample** creates a synthetic chart locally.
3. Select an entry and use **Draw boxes**. Draw again to attach another box to the same entry.
4. Use **Select / move** to move a box, or drag its bottom-right handle to resize. Controls below the image edit coordinates and the linked entry.
5. Download the desired dataset output before closing the page.

The interface is English; annotation text supports Unicode and other languages. Delete/Backspace removes the selected box outside form fields. Escape cancels a drag. Undo retains up to 40 recent operations; reopening a collection resets that history.

**There is no autosave.** Edits remain in memory while the page is open. The app downloads revised copies and does not overwrite input folders or archives.

## Three full dataset variants

Draw deception and answer-hint boxes once, then choose **Download dataset variants**. The default selection downloads one ZIP with three self-contained dataset folders:

| Folder | Rendered annotations |
| --- | --- |
| `hints_only/` | Green outlines for answer hints only |
| `deceptions_only/` | Red outlines for deceptions only |
| `deceptions_masked/` | Opaque violet masks over the same deception boxes |

The masked variant automatically uses deception geometry; there is no need to redraw masks. Each folder contains every dataset image. Images without relevant boxes remain unchanged. Observations and manually drawn evidence masks are not burned into these isolated variants.

Every variant retains **all session annotations**, including categories excluded from its pixels. Reopening any variant restores the complete editable session. Opening the combined ZIP uses its `hints_only` folder to restore that session. The **Variant** selector also offers individual downloads.

**Download revised dataset** exports all categories together. **Download annotated PNG** and **Download masked PNG** export only the current image; they do not replace saving the editable dataset.

## Input formats

ZIPs and extracted folders support these layouts. A single enclosing directory is detected automatically.

### Manifest-based collection

```text
collection/
  dataset.json
  manifest.json
  approved.csv       # optional
  images/
    example.jpg
```

`dataset.json` is an array of records. `manifest.json` maps records to images:

```json
[{"record_index": 0, "id": "example", "image_filename": "example.jpg"}]
```

The optional CSV must contain `id`, `deceptions`, and `visual_perceptions` columns. Those text columns are synchronized on export; unrelated columns are retained. List values use the original format's literal `\n` separator.

### Paired per-image records

```text
collection/
  images/example.jpg
  records/example.json   # alternatively: json/example.json
```

Image and JSON filenames are matched by stem. Ambiguous or missing matches are rejected. Records retain their original JSON files on export.

### Combined annotation collection

```text
collection/
  all_224_annotations.json
  manifest.json
  images/example.jpg
  json/example.json
```

The combined file is an array of wrappers containing `index`, `image`, `json`, and `annotation`, plus optional metadata. The loader follows the explicit paths and requires the wrapper annotation to agree with its per-image JSON. Export updates both copies and retains unrelated wrapper and manifest metadata. The historical combined filename is recognized; the loader does not require exactly 224 records.

Records in these layouts use `deceptions` and `visual_perceptions` text arrays. Fields such as `problem_type`, `website_solution`, `source`, and `popularity` are retained. Separate `hints` and `evidence_masks` arrays hold answer hints and manually described masks.

### Standalone JSON and image-only collections

**Import JSON** accepts the self-contained format:

```json
{
  "schemaVersion": 1,
  "images": [{
    "id": "image-1",
    "name": "example.png",
    "width": 600,
    "height": 400,
    "dataUrl": "data:image/png;base64,...",
    "entries": [{"id": "text-1", "type": "hint", "text": "A helpful clue"}],
    "boxes": [{"id": "box-1", "entryId": "text-1", "x": 20, "y": 30, "width": 80, "height": 60}]
  }]
}
```

Entry types are `deception`, `hint`, `perception`, and `mask`. The example above abbreviates the image bytes; use real raster base64 data in an actual file.

Image-only folders and individual PNG, JPEG, WebP, or GIF files start with blank entries. Prefer a still frame for animated images. Standalone **Download JSON** embeds the clean images. Variant packages instead contain `images/`, `annotations.json`, and `_neshane/`; their image records use `image_path`. Reopen those packages with **Open dataset ZIP/folder**.

## Associations and coordinates

Dataset records receive an additive `image_annotations` object containing a version, image dimensions, text references, and boxes. Text references retain stable IDs and point to positions in the original text arrays. Multiple boxes can reference one text ID.

Coordinates use original-image pixels with a top-left origin: X increases rightward and Y downward. Fractions are allowed. Boxes must stay within the image and have positive dimensions. Zoom does not change their geometry. Existing version 1 dataset annotations remain readable; current output uses annotation version 2.

## Clean originals and repeat exports

Normal dataset image references point to the rendered images. `_neshane/editing.json` records image mappings, dimensions, the variant, and SHA-256 hashes. Clean sources are retained under `_neshane/originals/` when needed; an untouched image can be its own clean source.

Neshane reopens from the clean originals and draws editable overlays once. Every export starts from those originals. Removing all annotations restores original pixels, and repeating an unchanged export does not accumulate boxes.

Keep `_neshane/` with the dataset for future editing. Missing or altered retained files are rejected rather than silently treating rendered pixels as clean input. Records marked `image_annotations.rasterized` require the retained-original metadata.

JPEG output keeps its format and resolution at quality 0.95. PNG and WebP retain their formats; annotated GIFs become still PNGs. The separate annotated PNG download is lossless. For experiments, supply the normal rendered dataset images to the participant/model, not the clean-original directory or full editing package.

## Privacy, browsers, and limits

Image and annotation processing happens locally in the browser. The app contains no analytics, upload endpoint, external assets, or runtime dependencies. GitHub access is needed only to obtain the code. Development dependency installation is separate from using the offline app.

Recent Chrome and Edge are the tested targets. Direct ZIP loading uses browser Deflate decompression; if unavailable, extract the archive and open its folder. Folder-picking support may vary in other browsers.

ZIP import supports stored and Deflate entries, validates checksums, ignores `__MACOSX` and hidden metadata, and resolves Unicode normalization and UTF-8/CP437 filename mismatches only when the match is unique. Corrupt files, unsafe paths, ambiguous names, inconsistent annotation copies, and incomplete mappings fail without replacing the open collection.

Encrypted, multi-volume, and ZIP64 archives are unsupported. Expanded input is limited to 1 GB total and 256 MB per file. Browser memory also limits practical collection size. Three complete variants use more disk space than one dataset. Exports use uncompressed ZIP entries for a dependency-free implementation.

## Development

```text
index.html             Built, standalone app
source/app.js          Editor, schema adapters, archive and image exports
source/shell.html      HTML and styles with a script insertion marker
source/build.py        Deterministic single-file build
source/README.md       Source notes
tests/app.test.cjs     Browser checks using only synthetic data
package.json           Development-only test dependency
```

After editing the source, rebuild with Python 3:

```sh
python3 source/build.py
```

The generated `index.html` is committed so people can run the app without build tools.

### Tests

Node.js 20 or newer and Python 3 are needed for development checks:

```sh
npm ci
npx playwright install chromium
npm test
```

Set `CHROME_PATH` to a local Chromium-compatible executable to use an existing browser instead of installing one. Tests generate synthetic raster images and dataset archives at runtime; they do not require or include research datasets. Temporary downloads are removed afterward.

Checks cover build consistency, multiple boxes per text, variant pixel inclusion/exclusion, opaque deception masking, archive layouts, complete-session reimport, stable rerendering, metadata retention, missing-input rejection, and unchanged images without relevant annotations. Changes to rendered output should be checked at original resolution as well as in the editor.
