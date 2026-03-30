# Manga Admin API

Base prefix: `${API_PREFIX}` (e.g., `/v1`)

Admin auth: Use Admin JWT via `Authorization: Bearer <token>` obtained from `POST /admin/auth/login`.

## Roles
- SUPERADMIN: Full access
- UPLOADER: Limited to CRUD manga and chapters

Catatan upload:
- Beberapa endpoint upload manga menggunakan `multipart/form-data` dan server akan mengupload file ke storage (B2) lalu menyimpan URL CDN (`CDN_BASE_URL_STORAGE/...`).
- Untuk gambar chapter manga hasil grab/scrape, **disarankan pakai flow backend-managed upload** agar FE tidak perlu upload ratusan gambar satu per satu ke storage.
- Flow direct-to-B2 dari client tetap tersedia, tetapi sekarang bersifat **opsional/advanced** dan bukan flow utama untuk grab chapter.
- Untuk cover manga pada create/update, jika `cover_manga` dikirim sebagai URL `http(s)`, path `/static/...`, atau URL localhost/static server, backend akan membaca sumber gambar lalu meng-upload ulang ke storage/B2 dan menyimpan URL CDN hasilnya.

## Endpoints

- GET `/admin/manga`
  - Roles: SUPERADMIN, UPLOADER
  - Query: `q`, `page`, `limit`
  - Resp: `{ ok, total, page, limit, items }`

- POST `/admin/manga`
  - Roles: SUPERADMIN, UPLOADER
  - Header: `Content-Type: multipart/form-data`
  - Upload: field `cover` (single image, opsional)
  - Alternatif (tanpa upload file): kirim `cover_manga` berisi URL cover (mis. URL CDN/B2 hasil presigned upload)
  - Jika `cover_manga` adalah URL `http(s)` non-storage/CDN, server akan download lalu upload ulang ke storage/B2.
  - Jika `cover_manga` adalah path `/static/...` atau URL localhost/static server, server akan membaca file lokal lalu upload ulang ke storage/B2.
  - Jika `cover_manga` sudah URL storage/CDN, nilainya disimpan apa adanya.
  - Field lain dikirim sebagai text: `judul_manga`(required), `sinopsis_manga`, `genre_manga`(string[]), `type_manga`(MANGA|MANHWA|MANHUA|COMIC), `author`, `artist`, `label_manga`, `tanggal_rilis_manga`(ISO), `rating_manga`(string)
  - Cover wajib dikirim melalui **salah satu**:
    - `cover` (file)
    - `cover_manga` (URL)
  - Resp: `{ ok, item }`

- GET `/admin/manga/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Resp: `{ ok, item }` (includes chapters)

- PUT `/admin/manga/:id`
  - Roles: SUPERADMIN, UPLOADER
  - Header: `Content-Type: multipart/form-data`
  - Body: any fields from POST (partial update), termasuk `rating_manga`(string)
  - Upload (opsional): field `cover` untuk mengganti cover
  - Alternatif (tanpa upload file): kirim `cover_manga` (URL) untuk mengganti cover
  - Jika `cover_manga` adalah URL `http(s)` non-storage/CDN, server akan download lalu upload ulang ke storage/B2.
  - Jika `cover_manga` adalah path `/static/...` atau URL localhost/static server, server akan membaca file lokal lalu upload ulang ke storage/B2.
  - Jika `cover_manga` sudah URL storage/CDN, nilainya disimpan apa adanya.
  - Resp: `{ ok, item }`

- POST `/admin/manga/:id/cover`
  - Roles: SUPERADMIN, UPLOADER
  - Upload: `multipart/form-data` field `cover` (single image). Uploaded to storage (B2).
  - The saved DB value for `cover_manga` is a CDN URL (`CDN_BASE_URL_STORAGE/...`).
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
  - Body: `{ url: string, title?: string, plan_only?: boolean }` source Komiku chapter URL; optional `title` saved if chapter missing title
  - Effect:
    - Default: backend akan **download gambar dari source lalu upload sendiri ke storage**.
    - Jika chapter sudah ada, backend akan **replace/update page berdasarkan `page_number`**, bukan membuat ulang row baru untuk page yang sama.
    - Jika jumlah page hasil grab lebih sedikit dari data lama, page lama yang tidak ada lagi akan ikut dihapus.
    - Jika `plan_only=true`, backend hanya mengembalikan rencana upload untuk flow FE direct-to-storage.
  - Resp default: `{ ok, chapter_id, pages, pages_created, pages_replaced, pages_removed }`
  - Resp (`plan_only=true`): `{ ok, chapter_id, pages, plan_only: true, uploads: [{ page_number, source_url, key, cdn_url, content_type }] }`
  - Follow-up (plan_only=true):
    - FE upload semua `source_url` ke `key` masing-masing via presigned PUT
    - lalu call `POST /admin/manga/:mangaId/chapters/:chapterNumber/pages` dengan `image_url` = `cdn_url`
    - lalu call `POST /admin/manga/:mangaId/chapters/:chapterNumber/refresh-dimensions`
  - Rekomendasi:
    - Untuk chapter dengan gambar banyak, **jangan** andalkan FE upload satu-satu ke storage.
    - Gunakan default flow backend-managed upload agar hasil lebih stabil.

- POST `/admin/manga/:mangaId/chapters/:chapterNumber/upload`
  - Roles: SUPERADMIN, UPLOADER
  - Upload: `multipart/form-data` with `images` (multiple files). Each image becomes 1 page in upload order. Optional field `title` to set chapter title if empty.
  - Behavior: New uploads are APPENDED after existing pages (not overwriting). Page numbers continue from the last existing page.
  - Storage: uploaded to B2 storage; `image_url` saved as CDN URL (`CDN_BASE_URL_STORAGE/...`).
  - Limits: up to 200 images, 10MB per file
  - Resp: `{ ok, chapter_id, pages }`

- POST `/admin/manga/:mangaId/chapters/:chapterNumber/pages`
  - Roles: SUPERADMIN, UPLOADER
  - Deskripsi: commit/update daftar page dari URL yang sudah di-upload langsung ke storage (B2) dari frontend.
  - Body (JSON):
    - `replace` (boolean, default false): jika true, page lama yang **tidak ada** di payload baru akan ikut dihapus.
    - `title` (opsional): set title chapter jika kosong.
    - `pages`: array of string URL *atau* array of object `{ page_number?, image_url }`
  - Catatan: `image_url` harus berupa URL `http/https` atau path `/static/...`.
  - Behavior:
    - Jika `page_number` sudah ada pada chapter tersebut, backend akan **replace image** pada row yang ada.
    - Jika `page_number` belum ada, backend akan membuat row baru.
    - Jika `replace=true`, page lama yang tidak terkirim lagi akan dihapus dari DB.
  - Resp: `{ ok, chapter_id, pages_received, pages_created, pages_replaced, pages_removed, replace }`

- POST `/admin/pages/:id/refresh-dimensions`
  - Roles: SUPERADMIN, UPLOADER
  - Deskripsi: hitung ulang `width`/`height` untuk 1 page berdasarkan `image_url` yang tersimpan.
  - Resp: `{ ok, item: { id, width, height } }`

- POST `/admin/manga/:mangaId/chapters/:chapterNumber/refresh-dimensions`
  - Roles: SUPERADMIN, UPLOADER
  - Deskripsi: hitung ulang `width`/`height` untuk pages dalam 1 chapter.
  - Body (opsional):
    - `only_missing` (boolean, default true)
  - Resp: `{ ok, updated, failed }`

- POST `/admin/manga/:mangaId/komiku/grab-range`
  - Roles: SUPERADMIN only
  - Body: `{ sample_url: string, start?: number, end?: number, title_prefix?: string, plan_only?: boolean }`
  - Behavior:
    - If `sample_url` is a chapter URL (e.g., `...-chapter-15/` or `...-chapter-15-2/`):
      - Preserves zero-padding in URL.
      - If URL has sub-part (e.g., `-15-2`): for the first chapter start at that sub (`-2`), then try `-3`.. until the first failure, then move to next chapter (starting sub at `-1`).
      - If URL has no sub-part: try base chapter first; if not found, probe `-1`, `-2`, ... until the first failure, then move to next chapter.
      - Sub-parts are stored with float `chapter_number` (e.g., `15-2` → `15.2`). Ensure your schema supports non-integer chapter numbers.
    - If `sample_url` is a series page (e.g., `https://komiku.org/manga/<slug>/`):
      - Scrapes chapter links from the page, parses chapter numbers (including subs as floats), sorts ascending, applies optional `start`/`end` filters (accepts floats), and grabs each.
    - Optional `title_prefix` sets chapter title as `"{title_prefix} {chapter}"` or `"{title_prefix} {chapter}-{sub}"` when missing.
    - Request ini sekarang **async/background job**. Endpoint start hanya membuat job, lalu proses grab berjalan di background.
  - Resp: `202 Accepted` dengan body `{ ok, manga_id, manga_title, job }`
  - Contoh field `job`:
    - `id`
    - `status`: `PENDING | RUNNING | COMPLETED | FAILED | PARTIAL`
    - `current_stage`: mis. `queued`, `preparing`, `grabbing`, `finished`, `failed`
    - `current_chapter_number`
    - `current_chapter_label`
  - Catatan: default `plan_only=false`, jadi backend akan upload sendiri hasil grab tiap chapter. Set `plan_only=true` hanya jika memang FE ingin menjalankan flow direct-to-storage secara manual.
  - Polling:
    - Setelah start job, FE/admin panel perlu poll endpoint detail job untuk membaca progress real-time.
  - Examples:
    - Range from chapter sample: `sample_url=https://komiku.org/...-chapter-02/`, `start=2`, `end=38` → generates `...-03/`, `...-04/`, ...
    - Sub-part aware: `sample_url=https://komiku.org/...-chapter-15-2/`, `start=15`, `end=16` → tries `15-2`, `15-3` (stop on first miss), then `16-1`, `16-2`, ...
    - Series page: `sample_url=https://komiku.org/manga/majo-no-tabitabi/`, optional `start`/`end` (floats) to limit processed chapters.

- GET `/admin/manga/grab-status`
  - Roles: SUPERADMIN only
  - Deskripsi: endpoint utama untuk `http polling` status grab secara global lintas manga. Cocok untuk dashboard admin yang harus terus refresh data progress.
  - Query:
    - `status?` optional filter: `PENDING | RUNNING | COMPLETED | FAILED | PARTIAL`
    - `limit?` default `20`, max `100`
  - Resp: `{ ok, filter, items }`
  - `filter`:
    - `status`: nilai filter aktif atau `null`
    - `limit`
  - Setiap item di `items` berbentuk:
    - `manga`: data manga
      - `id`
      - `judul_manga`
      - `cover_manga`
      - `type_manga`
      - `status_manga`
    - `job`: data status grab
      - `id`
      - `manga_id`
      - `sample_url`
      - `title_prefix`
      - `start_chapter`
      - `end_chapter`
      - `mode`
      - `plan_only`
      - `status`
      - `total_chapters`
      - `processed_chapters`
      - `success_chapters`
      - `failed_chapters`
      - `current_chapter_number`
      - `current_chapter_label`
      - `current_stage`
      - `error_message`
      - `startedAt`, `finishedAt`, `createdAt`, `updatedAt`
      - `admin: { id, username }`
  - Contoh penggunaan polling:
    - Poll tiap 2-5 detik untuk `status=RUNNING`
    - Render `manga.judul_manga` sebagai judul card
    - Render `job.current_chapter_label` untuk teks seperti `Sedang grab chapter 12`
    - Saat `job.status` berubah ke `COMPLETED`, `FAILED`, atau `PARTIAL`, card bisa dipindah ke tab/history

- GET `/admin/manga/:mangaId/komiku/grab-jobs`
  - Roles: SUPERADMIN only
  - Query:
    - `limit?` default `20`, max `100`
    - `status?` optional filter: `PENDING | RUNNING | COMPLETED | FAILED | PARTIAL`
  - Deskripsi: list riwayat job grab manga untuk 1 manga.
  - Resp: `{ ok, items }`
  - Setiap item berisi ringkasan progress:
    - `id`
    - `status`
    - `total_chapters`
    - `processed_chapters`
    - `success_chapters`
    - `failed_chapters`
    - `current_chapter_number`
    - `current_chapter_label`
    - `current_stage`
    - `error_message`
    - `startedAt`, `finishedAt`, `createdAt`, `updatedAt`
    - `admin: { id, username }`

- GET `/admin/manga/:mangaId/komiku/grab-jobs/:jobId`
  - Roles: SUPERADMIN only
  - Deskripsi: detail 1 job grab manga beserta item progress per chapter.
  - Resp: `{ ok, job }`
  - Field penting di `job`:
    - `status`
    - `current_stage`
    - `current_chapter_number`
    - `current_chapter_label`
    - `total_chapters`
    - `processed_chapters`
    - `success_chapters`
    - `failed_chapters`
    - `error_message`
  - Field `job.items` berisi progress per chapter:
    - `chapter_number`
    - `chapter_label`
    - `source_url`
    - `status`
    - `pages_count`
    - `error_message`
    - `startedAt`, `finishedAt`
  - Contoh penggunaan UI:
    - Saat `status=RUNNING` dan `current_chapter_label="1"`, tampilkan: `Sedang grab chapter 1`.
    - Saat field berubah ke `current_chapter_label="2"`, update UI menjadi: `Sedang grab chapter 2`.

- POST `/admin/manga/:mangaId/komiku/grab-jobs/:jobId/continue`
  - Roles: SUPERADMIN only
  - Deskripsi: melanjutkan job grab yang statusnya `FAILED | PARTIAL | COMPLETED` dengan cara **resume**.
    - Chapter yang sudah `COMPLETED` akan di-skip.
    - Chapter yang `FAILED` akan di-skip, kecuali `retry_failed=true`.
  - Body (JSON):
    - `retry_failed` (boolean, default false): jika true, chapter yang sebelumnya `FAILED` akan dicoba ulang.
  - Resp: `202 Accepted` `{ ok, job_id, manga_id, queued, retry_failed }`
  - Error:
    - `409 job_already_running` jika job masih RUNNING

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
