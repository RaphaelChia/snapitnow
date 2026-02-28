# Filter Pipeline — Implementation Plan

## Decision

**Hybrid approach: CSS preview on client + `sharp` processing on server.**

- Guest sees a CSS-approximated preview on the live camera feed.
- On capture, the **raw unfiltered frame** is uploaded.
- A server-side job applies the canonical filter with `sharp` and stores the processed result.
- Host gallery serves the processed version.

### Why this approach

- **Fast capture UX.** No client-side image processing at capture time — just grab the raw frame and upload. Critical for the "instant commit" film-camera feel on unstable event Wi-Fi.
- **Consistent output.** Every photo in a session looks identical regardless of device/browser rendering differences.
- **Simple client code.** CSS `filter` on the `<video>` element is one line of inline style. No WebGL, no pixel manipulation, no library.
- **Leverages existing stack.** `sharp` is already a dependency. Processing runs in Trigger.dev background jobs alongside compression and thumbnailing.
- **Preview ≠ final is acceptable.** The CSS preview is an approximation — real film cameras have a viewfinder that doesn't match the developed print either. This is on-brand.

---

## Filter Preset Registry

A single shared registry that maps each filter ID to its CSS preview string and its `sharp` pipeline function. This is the source of truth — session config, client preview, and server processing all reference it.

### Location

```
lib/filters/
  presets.ts        ← FilterPreset type + FILTER_PRESETS array (shared, isomorphic)
  server.ts         ← sharp pipeline functions (server-only, imports sharp)
  css.ts            ← CSS string map for client (tree-shakes out sharp)
```

### Type

```ts
// lib/filters/presets.ts

export type FilterId =
  | 'none'
  | 'vintage'
  | 'bw-classic'
  | 'bw-high-contrast'
  | 'cool-tone'
  | 'warm-fade'
  | 'vivid';

export type FilterPreset = {
  id: FilterId;
  name: string;           // display name in UI
  description: string;    // one-liner for tooltip/selection UI
};

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none',              name: 'No Filter',          description: 'Original unmodified photo' },
  { id: 'vintage',           name: 'Vintage',            description: 'Warm muted tones, slight fade' },
  { id: 'bw-classic',        name: 'B&W Classic',        description: 'Soft black and white' },
  { id: 'bw-high-contrast',  name: 'B&W Bold',           description: 'High contrast monochrome' },
  { id: 'cool-tone',         name: 'Cool Tone',          description: 'Blue-shifted, desaturated' },
  { id: 'warm-fade',         name: 'Warm Fade',          description: 'Golden highlights, lifted blacks' },
  { id: 'vivid',             name: 'Vivid',              description: 'Punchy saturation and contrast' },
];
```

### CSS preview map

```ts
// lib/filters/css.ts

import type { FilterId } from './presets';

export const FILTER_CSS: Record<FilterId, string> = {
  'none':              'none',
  'vintage':           'sepia(0.35) contrast(1.1) brightness(0.95) saturate(0.8)',
  'bw-classic':        'grayscale(1) contrast(1.15) brightness(1.05)',
  'bw-high-contrast':  'grayscale(1) contrast(1.5) brightness(0.95)',
  'cool-tone':         'hue-rotate(15deg) saturate(0.8) brightness(1.05) contrast(1.05)',
  'warm-fade':         'sepia(0.15) saturate(1.1) brightness(1.1) contrast(0.9)',
  'vivid':             'saturate(1.5) contrast(1.15) brightness(1.05)',
};
```

### Server-side sharp pipelines

```ts
// lib/filters/server.ts
import 'server-only';
import type { Sharp } from 'sharp';
import type { FilterId } from './presets';

type SharpPipeline = (img: Sharp) => Sharp;

export const FILTER_PIPELINES: Record<FilterId, SharpPipeline> = {
  'none': (img) => img,

  'vintage': (img) =>
    img
      .modulate({ saturation: 0.8, brightness: 0.95 })
      .tint({ r: 220, g: 200, b: 160 })
      .gamma(1.4),

  'bw-classic': (img) =>
    img
      .greyscale()
      .modulate({ brightness: 1.05 })
      .gamma(1.6),

  'bw-high-contrast': (img) =>
    img
      .greyscale()
      .linear(1.4, -(128 * 1.4 - 128))  // contrast boost via linear transform
      .modulate({ brightness: 0.95 }),

  'cool-tone': (img) =>
    img
      .modulate({ saturation: 0.8, brightness: 1.05 })
      .tint({ r: 180, g: 200, b: 230 }),

  'warm-fade': (img) =>
    img
      .modulate({ saturation: 1.1, brightness: 1.1 })
      .tint({ r: 240, g: 220, b: 180 })
      .gamma(1.3),

  'vivid': (img) =>
    img
      .modulate({ saturation: 1.5, brightness: 1.05 })
      .linear(1.15, -(128 * 1.15 - 128)),
};
```

### Important: CSS ≠ sharp parity

The CSS preview and the `sharp` pipeline will **not** produce identical results. This is by design:

- CSS `filter` is limited to a fixed set of operations. `sharp` can do much more (tint, gamma, linear contrast, overlay compositing).
- The preview is a **directional approximation** — it shows the guest the general vibe (warm/cool/bw/vivid) so they know what to expect.
- The `sharp` pipeline is the **canonical output** that appears in the host gallery.
- Fine-tune each side independently: CSS for "feels right on screen", sharp for "looks right in the final photo".

---

## Client-Side: Camera Preview with Filter

### Live preview

Apply the CSS filter as an inline style on the `<video>` element:

```tsx
<video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  style={{ filter: FILTER_CSS[activeFilterId] }}
  className="w-full h-full object-cover"
/>
```

- `activeFilterId` comes from session config (`fixed_filter` in fixed mode) or guest selection (preset mode).
- CSS `filter` is GPU-composited — no performance impact on mobile.
- The `<video>` element itself is never modified; only the visual rendering changes.

### Guest filter selection (preset mode)

When `session.filter_mode === 'preset'`, show a horizontal scrollable strip of filter thumbnails below the viewfinder. Each thumbnail is a small `<canvas>` or `<div>` with the CSS filter applied to a static preview frame.

```
┌──────────────────────────┐
│                          │
│     Camera viewfinder    │
│     (CSS filter active)  │
│                          │
├──────────────────────────┤
│ [Vintage] [B&W] [Cool]  │  ← horizontal scroll, tappable
├──────────────────────────┤
│       [ Capture ]        │
└──────────────────────────┘
```

- Filter options are limited to `session.allowed_filters` (array of FilterId values set by host).
- Guest selection updates `activeFilterId` in local state.
- Selected filter ID is sent with the capture request as `filter_used`.

### Capture flow

When the guest taps capture:

1. Draw the **unfiltered** frame from `<video>` to an offscreen `<canvas>`:
   ```ts
   const canvas = document.createElement('canvas');
   canvas.width = video.videoWidth;
   canvas.height = video.videoHeight;
   const ctx = canvas.getContext('2d')!;
   ctx.drawImage(video, 0, 0);  // no filter applied here
   ```
2. Export as JPEG blob:
   ```ts
   const blob = await new Promise<Blob>((resolve) =>
     canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92)
   );
   ```
3. Submit upload with metadata:
   ```ts
   { blob, sessionId, filterUsed: activeFilterId, idempotencyKey }
   ```
4. Lock capture button immediately. Decrement roll counter optimistically.

**Why upload raw?**
- Faster capture-to-upload (no processing delay).
- Smaller risk of client-side failure.
- Server has the raw original if filter presets are ever tweaked retroactively.
- Server processing is more powerful and consistent.

---

## Server-Side: Filter Processing Pipeline

### Storage layout

Two object paths per photo in the bucket:

```
sessions/{session_id}/raw/{photo_id}.jpg       ← original unfiltered capture
sessions/{session_id}/filtered/{photo_id}.jpg   ← processed with sharp pipeline
```

- `raw/` is kept for the 30-day retention period (supports re-processing if filter presets change).
- `filtered/` is what the host gallery and any download/share URLs point to.
- Both are cleaned up by the same 30-day lifecycle/deletion job.

### Processing flow

Triggered after successful raw upload:

```
Upload completes
  → photo record updated to status: 'uploaded'
  → enqueue Trigger.dev job: processPhotoFilter

processPhotoFilter job:
  1. Download raw image from storage
  2. Look up filter_used from photo record
  3. Run FILTER_PIPELINES[filter_used](sharp(rawBuffer))
  4. Apply shared post-processing:
     - Strip EXIF metadata (privacy)
     - Resize if > max dimension (e.g. 2048px long edge)
     - Compress to target quality (e.g. JPEG q=85)
     - Generate thumbnail (e.g. 400px, q=75)
  5. Upload filtered image + thumbnail to storage
  6. Update photo record: filtered_key, thumbnail_key, processed_at
```

### Photo record additions

The `photos` table needs two extra columns to track processed outputs:

```sql
alter table photos
  add column filtered_key  text,     -- object key for processed image
  add column thumbnail_key text,     -- object key for thumbnail
  add column processed_at  timestamptz;
```

Photo status progression:
```
pending_upload → uploaded (raw in bucket) → processed (filtered + thumbnail ready)
```

Consider adding `'processed'` to the status check constraint, or use `processed_at is not null` as the indicator.

### Trigger.dev job sketch

```ts
// jobs/process-photo-filter.ts
import { task } from '@trigger.dev/sdk/v3';
import sharp from 'sharp';
import { FILTER_PIPELINES } from '@/lib/filters/server';
import type { FilterId } from '@/lib/filters/presets';

export const processPhotoFilter = task({
  id: 'process-photo-filter',
  retry: { maxAttempts: 3 },
  run: async ({ photoId, rawKey, filterUsed }: {
    photoId: string;
    rawKey: string;
    filterUsed: FilterId;
  }) => {
    // 1. Download raw from storage
    const rawBuffer = await storageService.download(rawKey);

    // 2. Apply filter pipeline
    const pipeline = FILTER_PIPELINES[filterUsed];
    let img = pipeline(sharp(rawBuffer));

    // 3. Shared post-processing
    img = img
      .rotate()               // auto-rotate from EXIF
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true });

    const filteredBuffer = await img.toBuffer();

    // 4. Generate thumbnail
    const thumbBuffer = await sharp(filteredBuffer)
      .resize(400, 400, { fit: 'inside' })
      .jpeg({ quality: 75 })
      .toBuffer();

    // 5. Upload processed outputs
    const filteredKey = rawKey.replace('/raw/', '/filtered/');
    const thumbKey = rawKey.replace('/raw/', '/thumbs/');

    await Promise.all([
      storageService.upload(filteredKey, filteredBuffer, 'image/jpeg'),
      storageService.upload(thumbKey, thumbBuffer, 'image/jpeg'),
    ]);

    // 6. Update photo record
    await updatePhotoProcessed(photoId, { filteredKey, thumbKey });
  },
});
```

---

## Session Config Integration

### Host creates session

During session creation, the host picks:

- **Filter mode:**
  - `fixed` → host selects one `FilterId` → stored in `sessions.fixed_filter`
  - `preset` → host selects 2-5 filters from the list → stored in `sessions.allowed_filters` as JSON array

### Validation

```ts
// Zod schema for session creation
const createSessionSchema = z.object({
  title: z.string().min(1).max(100),
  password: z.string().optional(),
  filterMode: z.enum(['fixed', 'preset']),
  fixedFilter: z.enum(['none', 'vintage', 'bw-classic', ...]).optional(),
  allowedFilters: z.array(z.enum(['none', 'vintage', ...])).min(2).max(5).optional(),
  rollPreset: z.enum([8, 12, 24, 36]),
}).refine(
  (d) => d.filterMode === 'fixed' ? !!d.fixedFilter : (d.allowedFilters?.length ?? 0) >= 2,
  { message: 'Fixed mode requires a filter; preset mode requires at least 2 options' }
);
```

### Guest enters session

When guest joins, the client receives:

```ts
{
  filterMode: 'fixed' | 'preset',
  fixedFilter: FilterId | null,           // non-null when fixed
  allowedFilters: FilterId[] | null,      // non-null when preset
}
```

- Fixed mode: `activeFilterId` is locked to `fixedFilter`. No selection UI shown.
- Preset mode: `activeFilterId` defaults to first in `allowedFilters`. Guest can switch via the filter strip.

---

## MVP Filter Presets

Start with these 5 filters for MVP (plus `none`):

| ID | Name | Character | CSS Preview | Sharp Pipeline |
|----|------|-----------|-------------|----------------|
| `none` | No Filter | Clean, unmodified | `none` | passthrough |
| `vintage` | Vintage | Warm, desaturated, slight sepia | `sepia(0.35) contrast(1.1) brightness(0.95) saturate(0.8)` | tint warm + desat + gamma |
| `bw-classic` | B&W Classic | Soft, lifted blacks | `grayscale(1) contrast(1.15) brightness(1.05)` | greyscale + gamma lift |
| `bw-high-contrast` | B&W Bold | Punchy monochrome | `grayscale(1) contrast(1.5) brightness(0.95)` | greyscale + linear contrast |
| `cool-tone` | Cool Tone | Blue-ish, editorial | `hue-rotate(15deg) saturate(0.8) brightness(1.05)` | tint blue + desat |
| `warm-fade` | Warm Fade | Golden, faded highlights | `sepia(0.15) saturate(1.1) brightness(1.1) contrast(0.9)` | tint gold + gamma fade |

`vivid` is available in the registry but excluded from MVP to keep the selection list tight. Can be enabled later without code changes.

---

## File Structure Summary

```
lib/
  filters/
    presets.ts              ← FilterId type, FilterPreset type, FILTER_PRESETS array
    css.ts                  ← FILTER_CSS map (client-safe, no server deps)
    server.ts               ← FILTER_PIPELINES map (server-only, imports sharp)

app/(main)/sessions/
  [id]/camera/
    filter-strip.tsx        ← horizontal filter selector (preset mode only)
    camera-viewfinder.tsx   ← <video> with CSS filter applied
    capture-button.tsx      ← capture + upload logic

jobs/
  process-photo-filter.ts   ← Trigger.dev task for sharp processing
```

---

## Open Questions

- **Re-processing.** If a filter preset is tuned post-launch, do we re-process existing photos? Keeping raw originals makes this possible, but we'd need a batch re-process job. Decide based on whether hosts expect photos to update retroactively.
- **Thumbnail timing.** Generate thumbnail from the filtered output (current plan) or from raw? Filtered makes more sense since the gallery should match.
- **Filter preview thumbnails.** For the guest selection strip, we could capture a single frame on camera open and render it through each CSS filter as a tiny preview. This gives a "try before you shoot" feel. Implementation cost is low — worth including in MVP.
- **Download format.** When host downloads photos, serve the filtered version. Consider offering a "download originals" option for hosts who want unfiltered copies (post-MVP).
