# Manga Admin API

Base prefix: `${API_PREFIX}` (e.g., `/v1`)

Admin auth: Use Admin JWT via `Authorization: Bearer <token>` obtained from `POST /admin/auth/login`.

## Roles
- SUPERADMIN: Full access
- UPLOADER: Limited to CRUD manga and chapters

## Endpoints

- GET `/admin/manga`
  - Roles: SUPERADMIN, UPLOADER
  - Query: `q`, `page`, `limit`
  - Resp: `{ ok, total, page, limit, items }`

- POST `/admin/manga`
  - Roles: SUPERADMIN, UPLOADER
  - Body: `judul_manga`(required), `sinopsis_manga`, `cover_manga`, `genre_manga`(string[]), `type_manga`(MANGA|MANHWA|MANHUA|COMIC), `author`, `artist`, `label_manga`, `tanggal_rilis_manga`(ISO), `rating_manga`(number)
  - Resp: `{ ok, item }`

- GET `/admin/manga/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Resp: `{ ok, item }` (includes chapters)

- PUT `/admin/manga/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Body: any fields from POST (partial update), termasuk `rating_manga`(number)
  - Resp: `{ ok, item }`

- POST `/admin/manga/:id/cover`
  - Roles: SUPERADMIN, UPLOADER
  - Upload: `multipart/form-data` field `cover` (single image). Stored locally in `static/manga_covers/{id}/`.
  - The saved DB value for `cover_manga` is an absolute URL: `${URL_BASE}/static/manga_covers/{id}/{filename}`
  - Resp: `{ ok, cover_url }`

- DELETE `/admin/manga/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Cascades: deletes chapters, pages, related progresses/claims, favorites, views
  - Resp: `{ ok: true }`

- GET `/admin/manga/:mangaId/chapters`
  - Roles: SUPERADMIN, UPLOADER
  - Resp: `{ ok, items }`

- POST `/admin/manga/:mangaId/chapters`
  - Roles: SUPERADMIN, UPLOADER
  - Body: `chapter_number`(number), `title`(optional)
  - Resp: `{ ok, item }`

- GET `/admin/chapters/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Resp: `{ ok, item }` (includes pages)

- PUT `/admin/chapters/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Body: `chapter_number`, `title`
  - Resp: `{ ok, item }`

- DELETE `/admin/chapters/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Cascades: deletes pages and reading artifacts
  - Resp: `{ ok: true }`

- POST `/admin/manga/:mangaId/chapters/:chapterNumber/grab`
  - Roles: SUPERADMIN only
  - Body: `{ url: string, title?: string }` source Komiku chapter URL; optional `title` saved if chapter missing title
  - Effect: downloads images to `static/manga/{mangaId}/{chapterNumber}/` and stores pages in DB
  - Resp: `{ ok, chapter_id, pages }`

- POST `/admin/manga/:mangaId/chapters/:chapterNumber/upload`
  - Roles: SUPERADMIN, UPLOADER
  - Upload: `multipart/form-data` with `images` (multiple files). Each image becomes 1 page in upload order. Optional field `title` to set chapter title if empty.
  - Behavior: New uploads are APPENDED after existing pages (not overwriting). Page numbers continue from the last existing page.
  - Limits: up to 200 images, 20MB per file
  - Resp: `{ ok, chapter_id, pages }`

- POST `/admin/manga/:mangaId/komiku/grab-range`
  - Roles: SUPERADMIN only
  - Body: `{ sample_url: string, start?: number, end?: number, title_prefix?: string }`
  - Behavior:
    - If `sample_url` is a chapter URL (e.g., `...-chapter-15/` or `...-chapter-15-2/`):
      - Preserves zero-padding in URL.
      - If URL has sub-part (e.g., `-15-2`): for the first chapter start at that sub (`-2`), then try `-3`.. until the first failure, then move to next chapter (starting sub at `-1`).
      - If URL has no sub-part: try base chapter first; if not found, probe `-1`, `-2`, ... until the first failure, then move to next chapter.
      - Sub-parts are stored with float `chapter_number` (e.g., `15-2` → `15.2`). Ensure your schema supports non-integer chapter numbers.
    - If `sample_url` is a series page (e.g., `https://komiku.org/manga/<slug>/`):
      - Scrapes chapter links from the page, parses chapter numbers (including subs as floats), sorts ascending, applies optional `start`/`end` filters (accepts floats), and grabs each.
    - Optional `title_prefix` sets chapter title as `"{title_prefix} {chapter}"` or `"{title_prefix} {chapter}-{sub}"` when missing.
  - Resp: `{ ok, manga_id, range?: { start, end }, mode?: "series_page", successes: [{ chapter, pages }], failures: [{ chapter, error }] }`
  - Examples:
    - Range from chapter sample: `sample_url=https://komiku.org/...-chapter-02/`, `start=2`, `end=38` → generates `...-03/`, `...-04/`, ...
    - Sub-part aware: `sample_url=https://komiku.org/...-chapter-15-2/`, `start=15`, `end=16` → tries `15-2`, `15-3` (stop on first miss), then `16-1`, `16-2`, ...
    - Series page: `sample_url=https://komiku.org/manga/majo-no-tabitabi/`, optional `start`/`end` (floats) to limit processed chapters.

- GET `/admin/manga/:mangaId/chapters/:chapterNumber/pages`
  - Roles: SUPERADMIN, UPLOADER
  - Resp: `{ ok, chapter: { id, title }, pages: [{ id, page_number, image_url, width, height, ...}] }`

- GET `/admin/chapters/:id/pages`
  - Roles: SUPERADMIN, UPLOADER
  - Resp: `{ ok, chapter: { id, manga_id, chapter_number, title }, pages: [...] }`

- DELETE `/admin/pages/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Delete a single page by page ID
  - Also removes the underlying image file from the server if present
  - Resp: `{ ok: true }`

- DELETE `/admin/manga/:mangaId/chapters/:chapterNumber/pages/:pageNumber`
  - Roles: SUPERADMIN, UPLOADER
  - Delete a single page by its `pageNumber` within a chapter
  - Also removes the underlying image file from the server if present
  - Resp: `{ ok: true }`

## Superadmin-only public route change

- POST `/manga/komiku/grab`
  - Now restricted to SUPERADMIN via Admin JWT
  - Body: `{ url, manga_id, chapter_number, title? }`
  - Resp: `{ ok, chapter_id, pages }`
