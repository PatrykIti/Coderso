-- TASK-580-03-L03: Non-destructive backfill of stored v1 detail-page
-- documents (schemaVersion 1) to schemaVersion 2 sections/bindings.
--
-- Mirrors the canonical TS conversion (core/services/content/detailPageV2Conversion.ts
-- + detailPageV2WidgetMap.ts, TASK-580-03-L02) and is parity-tested against
-- the shared fixture corpus (tests/fixtures/detailPageV2Conversion/*.json) by
-- tests/integration/detailPages/detailPageV2BackfillMigration.test.ts. Where
-- the SQL and the TS map could ever disagree, the fixture corpus is the
-- arbiter and the parity test must fail loudly.
--
-- Semantics (parity with the L02 map):
--   - Mapped widget types (hero, timeline, faq-accordion, cta-banner,
--     feature-grid, testimonials, gallery-mosaic, grid-columns,
--     rich-text-section, divider, spacer, content-list, posts-feed,
--     listing-filters, entry-teaser, form-embed, and contact/newsletter with a
--     resolvable formId) become typed V2 sections with deterministic block ids
--     `<blockId>-<role>`.
--   - navigation/footer are dropped (the site shell owns them).
--   - Every other registered type becomes a `custom` section with one
--     read-only `legacy-widget` block (`legacyWidgetType` = original type,
--     `data` preserved byte-identically).
--   - Bindings targeting dropped/unmapped blocks or prop paths are removed;
--     surviving bindings are remapped onto the new block ids/prop paths.
--   - Missing block ids fall back to `block-<md5(block::text)>` (0061 pattern).
--
-- Rollback: pure data backfill, no DDL. Restore from the pre-migration backup
-- to revert; the migration never drops columns or tables.
--
-- Forward recovery: rows skipped by the WHERE guard (already v2, or NULL
-- published_document) are already canonical; any row left behind (for example
-- inserted concurrently between migrate runs) is still served by the L02 read
-- adapter (`normalizeDetailPageDocumentForRead` converts v1 in memory).
--
-- Idempotency: the WHERE guard only touches rows whose current/published
-- schemaVersion is not '2' (NULL published_document is excluded), so
-- re-running the migration is a no-op.
--
-- Concurrency/locking: the single UPDATE takes row locks only (no table
-- rewrite); `detail_page_revisions` is untouched, so the lifecycle writer
-- (`detailPageDocumentLifecycleMutation.ts`: readDetailPageTx `.for("update")`
-- locks at 261/269, `acquireNativeCmsWriterFence` at 206, and the
-- `max(version)+1` revision allocation at 331/340) is unaffected.
-- `detail_page_revisions.document` rows remain v1 and are converted on read
-- by the adapter.
CREATE OR REPLACE FUNCTION "_coderso_detail_page_section_v2"("block" jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  WITH "input" AS (
    SELECT
      COALESCE(NULLIF("block" ->> 'id', ''), 'block-' || md5("block"::text)) AS "id_base",
      "block" AS "b"
  )
  SELECT CASE
    WHEN "input"."b" ->> 'type' IN ('navigation', 'footer') THEN NULL
    ELSE jsonb_build_object(
    'id', "input"."id_base",
    'type', CASE "input"."b" ->> 'type'
      WHEN 'hero' THEN 'hero'
      WHEN 'timeline' THEN 'timeline'
      WHEN 'faq-accordion' THEN 'faq'
      WHEN 'cta-banner' THEN 'cta'
      WHEN 'feature-grid' THEN 'feature-grid'
      WHEN 'testimonials' THEN 'testimonials'
      WHEN 'gallery-mosaic' THEN 'gallery'
      WHEN 'grid-columns' THEN 'content'
      WHEN 'rich-text-section' THEN 'content'
      WHEN 'divider' THEN 'content'
      WHEN 'spacer' THEN 'content'
      WHEN 'content-list' THEN 'content'
      WHEN 'posts-feed' THEN 'content'
      WHEN 'listing-filters' THEN 'content'
      WHEN 'entry-teaser' THEN 'content'
      WHEN 'form-embed' THEN 'content'
      WHEN 'contact' THEN 'content'
      WHEN 'newsletter' THEN 'content'
      ELSE 'custom'
    END,
    -- Mirrors `toSectionName(sectionType)` from the L02 TS map: each
    -- hyphen-separated part capitalized and joined with a space.
    'name', CASE CASE "input"."b" ->> 'type'
      WHEN 'hero' THEN 'hero'
      WHEN 'timeline' THEN 'timeline'
      WHEN 'faq-accordion' THEN 'faq'
      WHEN 'cta-banner' THEN 'cta'
      WHEN 'feature-grid' THEN 'feature-grid'
      WHEN 'testimonials' THEN 'testimonials'
      WHEN 'gallery-mosaic' THEN 'gallery'
      WHEN 'grid-columns' THEN 'content'
      WHEN 'rich-text-section' THEN 'content'
      WHEN 'divider' THEN 'content'
      WHEN 'spacer' THEN 'content'
      WHEN 'content-list' THEN 'content'
      WHEN 'posts-feed' THEN 'content'
      WHEN 'listing-filters' THEN 'content'
      WHEN 'entry-teaser' THEN 'content'
      WHEN 'form-embed' THEN 'content'
      WHEN 'contact' THEN 'content'
      WHEN 'newsletter' THEN 'content'
      ELSE 'custom'
    END
      WHEN 'hero' THEN 'Hero'
      WHEN 'timeline' THEN 'Timeline'
      WHEN 'faq' THEN 'Faq'
      WHEN 'cta' THEN 'Cta'
      WHEN 'feature-grid' THEN 'Feature Grid'
      WHEN 'testimonials' THEN 'Testimonials'
      WHEN 'gallery' THEN 'Gallery'
      WHEN 'content' THEN 'Content'
      WHEN 'custom' THEN 'Custom'
      ELSE 'Custom'
    END,
    'variant', CASE "input"."b" ->> 'type'
      WHEN 'hero' THEN 'centered'
      WHEN 'cta-banner' THEN 'centered'
      WHEN 'feature-grid' THEN 'cards'
      WHEN 'testimonials' THEN 'cards'
      WHEN 'gallery-mosaic' THEN 'grid'
      ELSE 'default'
    END,
    -- SECTION_DEFAULTS from detailPageV2Conversion.ts (nulls are significant
    -- and MUST be emitted; the parity fixtures pin them).
    'layout', '{"columns":1,"align":"start","justify":"start","maxWidth":1080,"stackVertical":false}'::jsonb,
    'style', '{"background":"#ffffff","backgroundType":"color","backgroundImage":null,"accent":"#0d9488","radius":0,"shadow":"none"}'::jsonb,
    'spacing', '{"paddingTop":64,"paddingBottom":64,"paddingLeft":40,"paddingRight":40,"gap":24}'::jsonb,
    'visibility', '{"visible":true,"authOnly":false,"anchor":null,"startsAt":null,"endsAt":null}'::jsonb,
    'responsive', '{}'::jsonb,
    'blocks', CASE "input"."b" ->> 'type'
      WHEN 'hero' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,headline}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-text', 'type', 'text',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,body}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-badge', 'type', 'badge',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,badge,label}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-button', 'type', 'button',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'label', "input"."b" #>> '{data,primaryCta,label}',
            'href', "input"."b" #>> '{data,primaryCta,href}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-image', 'type', 'image',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'src', "input"."b" #>> '{data,media,src}',
            'alt', "input"."b" #>> '{data,media,alt}')),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'timeline' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,title}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-text', 'type', 'text',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,description}')),
          'visibility', '{"visible":true}'::jsonb)
      ) || (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', "input"."id_base" || '-card-' || ("item"."ord" - 1),
                'type', 'card',
                'props', jsonb_strip_nulls(jsonb_build_object(
                  'title', "item"."value" #>> '{title}',
                  'text', "item"."value" #>> '{description}')),
                'visibility', '{"visible":true}'::jsonb)
              ORDER BY "item"."ord"), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE("input"."b" #> '{data,steps}', '[]'::jsonb))
             WITH ORDINALITY AS "item"("value", "ord"))
      WHEN 'faq-accordion' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,title}')),
          'visibility', '{"visible":true}'::jsonb)
      ) || (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', "input"."id_base" || '-' || "role"."suffix" || '-' || ("item"."ord" - 1),
                'type', "role"."btype",
                'props', jsonb_strip_nulls(jsonb_build_object('text', "role"."text_value")),
                'visibility', '{"visible":true}'::jsonb)
              ORDER BY "item"."ord", "role"."role_order"), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE("input"."b" #> '{data,items}', '[]'::jsonb))
             WITH ORDINALITY AS "item"("value", "ord")
           CROSS JOIN LATERAL (VALUES
             (1, 'question', 'heading', "item"."value" #>> '{question}'),
             (2, 'answer', 'text', "item"."value" #>> '{answer}')
           ) AS "role"("role_order", "suffix", "btype", "text_value"))
      WHEN 'cta-banner' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,content,title}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-text', 'type', 'text',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,content,description}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-button', 'type', 'button',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'label', "input"."b" #>> '{data,actions,primaryCta,label}',
            'href', "input"."b" #>> '{data,actions,primaryCta,href}')),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'feature-grid' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,eyebrow}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-heading-1', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,title}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-text', 'type', 'text',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,description}')),
          'visibility', '{"visible":true}'::jsonb)
      ) || (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', "input"."id_base" || '-card-' || ("item"."ord" - 1),
                'type', 'card',
                'props', jsonb_strip_nulls(jsonb_build_object(
                  'title', "item"."value" #>> '{title}',
                  'text', "item"."value" #>> '{description}')),
                'visibility', '{"visible":true}'::jsonb)
              ORDER BY "item"."ord"), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE("input"."b" #> '{data,items}', '[]'::jsonb))
             WITH ORDINALITY AS "item"("value", "ord"))
      WHEN 'testimonials' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,title}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-text', 'type', 'text',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,description}')),
          'visibility', '{"visible":true}'::jsonb)
      ) || (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', "input"."id_base" || '-quote-' || ("item"."ord" - 1),
                'type', 'quote',
                'props', jsonb_strip_nulls(jsonb_build_object(
                  'text', "item"."value" #>> '{quote}',
                  'cite', "item"."value" #>> '{author}')),
                'visibility', '{"visible":true}'::jsonb)
              ORDER BY "item"."ord"), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE("input"."b" #> '{data,testimonials}', '[]'::jsonb))
             WITH ORDINALITY AS "item"("value", "ord"))
      WHEN 'gallery-mosaic' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,header,title}')),
          'visibility', '{"visible":true}'::jsonb)
      ) || (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', "input"."id_base" || '-image-' || ("item"."ord" - 1),
                'type', 'image',
                'props', jsonb_strip_nulls(jsonb_build_object(
                  'src', "item"."value" #>> '{image}',
                  'alt', "item"."value" #>> '{alt}')),
                'visibility', '{"visible":true}'::jsonb)
              ORDER BY "item"."ord"), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE("input"."b" #> '{data,items}', '[]'::jsonb))
             WITH ORDINALITY AS "item"("value", "ord"))
      WHEN 'grid-columns' THEN jsonb_build_array(
        jsonb_build_object(
          'id', "input"."id_base" || '-columns',
          'type', 'columns',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'count', (
              SELECT LEAST(4, GREATEST(1, jsonb_array_length("cols"."c")))::int
              FROM (SELECT CASE
                WHEN jsonb_typeof("input"."b" #> '{data,columns}') = 'array'
                  THEN "input"."b" #> '{data,columns}'
                ELSE '[]'::jsonb END AS "c") AS "cols"
            )
          )),
          'visibility', '{"visible":true}'::jsonb,
          'slots', (
            SELECT COALESCE(jsonb_object_agg('column:' || "n"."gs", '[]'::jsonb), '{}'::jsonb)
            FROM generate_series(
              1,
              (SELECT LEAST(4, GREATEST(1, jsonb_array_length("cols"."c")))::int
               FROM (SELECT CASE
                 WHEN jsonb_typeof("input"."b" #> '{data,columns}') = 'array'
                   THEN "input"."b" #> '{data,columns}'
                 ELSE '[]'::jsonb END AS "c") AS "cols")
            ) AS "n"("gs")
          )
        )
      )
      WHEN 'rich-text-section' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-heading', 'type', 'heading',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,titleBlock,title}')),
          'visibility', '{"visible":true}'::jsonb),
        jsonb_build_object('id', "input"."id_base" || '-text', 'type', 'text',
          'props', jsonb_strip_nulls(jsonb_build_object('text', "input"."b" #>> '{data,body,html}')),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'divider' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-divider', 'type', 'divider',
          'props', jsonb_strip_nulls(jsonb_build_object('thickness', "input"."b" #>> '{data,thickness}')),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'spacer' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-spacer', 'type', 'spacer',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'size', (
              SELECT CASE
                WHEN jsonb_typeof("input"."b" #> '{data,height,desktop}') = 'number'
                  THEN LEAST(240, GREATEST(0, trunc(("input"."b" #>> '{data,height,desktop}')::numeric)))::int
                WHEN jsonb_typeof("input"."b" #> '{data,height,desktop}') = 'string'
                  THEN LEAST(240, GREATEST(0, ("regexp_match"("input"."b" #>> '{data,height,desktop}', '^\d+'))[1]::numeric))::int
                ELSE NULL
              END
            )
          )),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'content-list' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-collection', 'type', 'collection',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'contentTypeId', NULLIF(btrim(COALESCE("input"."b" #>> '{data,source,contentTypeId}', '')), ''),
            'queryId', NULLIF(btrim(COALESCE("input"."b" #>> '{data,source,listingQueryId}', '')), ''),
            'limit', (
              SELECT CASE
                WHEN jsonb_typeof("input"."b" #> '{data,source,limit}') = 'number'
                  THEN LEAST(24, GREATEST(1, trunc(("input"."b" #>> '{data,source,limit}')::numeric)))::int
                WHEN jsonb_typeof("input"."b" #> '{data,source,limit}') = 'string'
                  THEN LEAST(24, GREATEST(1, ("regexp_match"("input"."b" #>> '{data,source,limit}', '^\d+'))[1]::numeric))::int
                ELSE NULL
              END
            )
          )),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'posts-feed' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-collection', 'type', 'collection',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'limit', (
              SELECT CASE
                WHEN jsonb_typeof("input"."b" #> '{data,source,limit}') = 'number'
                  THEN LEAST(24, GREATEST(1, trunc(("input"."b" #>> '{data,source,limit}')::numeric)))::int
                WHEN jsonb_typeof("input"."b" #> '{data,source,limit}') = 'string'
                  THEN LEAST(24, GREATEST(1, ("regexp_match"("input"."b" #>> '{data,source,limit}', '^\d+'))[1]::numeric))::int
                ELSE NULL
              END
            )
          )),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'listing-filters' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-filters', 'type', 'filters',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'queryId', NULLIF(btrim(COALESCE("input"."b" #>> '{data,listingQueryId}', '')), ''),
            'autoApply', CASE WHEN jsonb_typeof("input"."b" -> 'data' -> 'autoApply') = 'boolean'
              THEN ("input"."b" -> 'data' -> 'autoApply')::boolean ELSE NULL END,
            'showSearch', CASE WHEN jsonb_typeof("input"."b" -> 'data' -> 'showSearch') = 'boolean'
              THEN ("input"."b" -> 'data' -> 'showSearch')::boolean ELSE NULL END,
            'showCount', CASE WHEN jsonb_typeof("input"."b" -> 'data' -> 'showCount') = 'boolean'
              THEN ("input"."b" -> 'data' -> 'showCount')::boolean ELSE NULL END,
            'searchLabel', NULLIF(btrim(COALESCE("input"."b" #>> '{data,searchLabel}', '')), ''),
            'searchPlaceholder', NULLIF(btrim(COALESCE("input"."b" #>> '{data,searchPlaceholder}', '')), ''),
            'applyLabel', NULLIF(btrim(COALESCE("input"."b" #>> '{data,applyLabel}', '')), '')
          )),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'entry-teaser' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-card', 'type', 'card',
          'props', jsonb_strip_nulls(jsonb_build_object(
            'title', "input"."b" #>> '{data,section,title}',
            'text', "input"."b" #>> '{data,section,description}',
            'href', "input"."b" #>> '{data,cta,href}',
            'image', "input"."b" #>> '{data,section,image}'
          )),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'form-embed' THEN jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-embed', 'type', 'embed',
          'props', jsonb_build_object('url', NULL),
          'visibility', '{"visible":true}'::jsonb)
      )
      WHEN 'contact' THEN
        CASE WHEN NULLIF(btrim(COALESCE("input"."b" #>> '{data,form,submission,formId}', '')), '') IS NOT NULL
          THEN jsonb_build_array(
            jsonb_build_object('id', "input"."id_base" || '-form', 'type', 'form',
              'props', jsonb_strip_nulls(jsonb_build_object('formId', "input"."b" #>> '{data,form,submission,formId}')),
              'visibility', '{"visible":true}'::jsonb)
          )
          ELSE jsonb_build_array(
            jsonb_build_object('id', "input"."id_base" || '-legacy', 'type', 'legacy-widget',
              'props', jsonb_build_object(
                'legacyWidgetType', COALESCE("input"."b" ->> 'type', 'unknown'),
                'data', CASE WHEN jsonb_typeof("input"."b" -> 'data') = 'object'
                  THEN "input"."b" -> 'data' ELSE '{}'::jsonb END),
              'visibility', '{"visible":true}'::jsonb)
          )
        END
      WHEN 'newsletter' THEN
        CASE WHEN NULLIF(btrim(COALESCE("input"."b" #>> '{data,submission,formId}', '')), '') IS NOT NULL
          THEN jsonb_build_array(
            jsonb_build_object('id', "input"."id_base" || '-form', 'type', 'form',
              'props', jsonb_strip_nulls(jsonb_build_object('formId', "input"."b" #>> '{data,submission,formId}')),
              'visibility', '{"visible":true}'::jsonb)
          )
          ELSE jsonb_build_array(
            jsonb_build_object('id', "input"."id_base" || '-legacy', 'type', 'legacy-widget',
              'props', jsonb_build_object(
                'legacyWidgetType', COALESCE("input"."b" ->> 'type', 'unknown'),
                'data', CASE WHEN jsonb_typeof("input"."b" -> 'data') = 'object'
                  THEN "input"."b" -> 'data' ELSE '{}'::jsonb END),
              'visibility', '{"visible":true}'::jsonb)
          )
        END
      ELSE jsonb_build_array(
        jsonb_build_object('id', "input"."id_base" || '-legacy', 'type', 'legacy-widget',
          'props', jsonb_build_object(
            'legacyWidgetType', COALESCE("input"."b" ->> 'type', 'unknown'),
            'data', CASE WHEN jsonb_typeof("input"."b" -> 'data') = 'object'
              THEN "input"."b" -> 'data' ELSE '{}'::jsonb END),
          'visibility', '{"visible":true}'::jsonb)
      )
    END
  ) END
  FROM "input"
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "_coderso_detail_page_binding_v2"("binding" jsonb, "blocks" jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  WITH RECURSIVE "walk" AS (
    SELECT "value" AS "b"
    FROM jsonb_array_elements(COALESCE("blocks", '[]'::jsonb)) AS "x"("value")
    UNION ALL
    SELECT "expanded"."value"
    FROM "walk"
    CROSS JOIN LATERAL (
      SELECT "child"."value"
      FROM jsonb_array_elements(COALESCE("walk"."b" -> 'children', '[]'::jsonb)) AS "child"("value")
      UNION ALL
      SELECT "slot_child"."value"
      FROM jsonb_each(COALESCE("walk"."b" -> 'slots', '{}'::jsonb)) AS "s"("key", "value")
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE("s"."value", '[]'::jsonb)) AS "slot_child"("value")
    ) AS "expanded"
  ),
  "old_block" AS (
    SELECT "w"."b" AS "ob"
    FROM "walk" "w"
    WHERE "w"."b" ->> 'id' = "binding" ->> 'blockId'
    LIMIT 1
  ),
  "remap" AS (
    SELECT
      "o"."ob",
      "o"."ob" ->> 'type' AS "ob_type",
      CASE
        -- Item-binding remaps (spec.itemBindingRemap, wildcard `*` = item
        -- index), keyed by `type.field` exactly like the L02 map table.
        WHEN "o"."ob" ->> 'type' IN ('timeline', 'faq-accordion', 'feature-grid', 'testimonials', 'gallery-mosaic')
          AND "binding" ->> 'propPath' ~ '^[^.]+\.\d+\.[^.]+$'
        THEN CASE (("o"."ob" ->> 'type') || '.' || split_part("binding" ->> 'propPath', '.', 3))
          WHEN 'timeline.title' THEN jsonb_build_object('role', 'card-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'title')
          WHEN 'timeline.description' THEN jsonb_build_object('role', 'card-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'text')
          WHEN 'faq-accordion.question' THEN jsonb_build_object('role', 'question-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'text')
          WHEN 'faq-accordion.answer' THEN jsonb_build_object('role', 'answer-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'text')
          WHEN 'feature-grid.title' THEN jsonb_build_object('role', 'card-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'title')
          WHEN 'feature-grid.description' THEN jsonb_build_object('role', 'card-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'text')
          WHEN 'testimonials.quote' THEN jsonb_build_object('role', 'quote-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'text')
          WHEN 'testimonials.author' THEN jsonb_build_object('role', 'quote-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'cite')
          WHEN 'gallery-mosaic.image' THEN jsonb_build_object('role', 'image-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'src')
          WHEN 'gallery-mosaic.alt' THEN jsonb_build_object('role', 'image-' || split_part("binding" ->> 'propPath', '.', 2), 'propPath', 'alt')
          ELSE NULL END
        -- Static binding remaps (spec.bindingRemap), per widget type.
        WHEN "o"."ob" ->> 'type' = 'hero' THEN CASE "binding" ->> 'propPath'
          WHEN 'headline' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          WHEN 'body' THEN jsonb_build_object('role', 'text', 'propPath', 'text')
          WHEN 'badge.label' THEN jsonb_build_object('role', 'badge', 'propPath', 'text')
          WHEN 'primaryCta.label' THEN jsonb_build_object('role', 'button', 'propPath', 'label')
          WHEN 'primaryCta.href' THEN jsonb_build_object('role', 'button', 'propPath', 'href')
          WHEN 'media' THEN jsonb_build_object('role', 'image', 'propPath', 'src')
          WHEN 'media.src' THEN jsonb_build_object('role', 'image', 'propPath', 'src')
          WHEN 'media.alt' THEN jsonb_build_object('role', 'image', 'propPath', 'alt')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'timeline' THEN CASE "binding" ->> 'propPath'
          WHEN 'header.title' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          WHEN 'header.description' THEN jsonb_build_object('role', 'text', 'propPath', 'text')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'faq-accordion' THEN CASE "binding" ->> 'propPath'
          WHEN 'header.title' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          WHEN 'header.description' THEN jsonb_build_object('role', 'text', 'propPath', 'text')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'cta-banner' THEN CASE "binding" ->> 'propPath'
          WHEN 'content.title' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          WHEN 'content.description' THEN jsonb_build_object('role', 'text', 'propPath', 'text')
          WHEN 'actions.primaryCta.label' THEN jsonb_build_object('role', 'button', 'propPath', 'label')
          WHEN 'actions.primaryCta.href' THEN jsonb_build_object('role', 'button', 'propPath', 'href')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'feature-grid' THEN CASE "binding" ->> 'propPath'
          WHEN 'header.eyebrow' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          WHEN 'header.title' THEN jsonb_build_object('role', 'heading:1', 'propPath', 'text')
          WHEN 'header.description' THEN jsonb_build_object('role', 'text', 'propPath', 'text')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'testimonials' THEN CASE "binding" ->> 'propPath'
          WHEN 'header.title' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          WHEN 'header.description' THEN jsonb_build_object('role', 'text', 'propPath', 'text')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'gallery-mosaic' THEN CASE "binding" ->> 'propPath'
          WHEN 'header.title' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'rich-text-section' THEN CASE "binding" ->> 'propPath'
          WHEN 'titleBlock.title' THEN jsonb_build_object('role', 'heading', 'propPath', 'text')
          WHEN 'body.html' THEN jsonb_build_object('role', 'text', 'propPath', 'text')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'content-list' THEN CASE "binding" ->> 'propPath'
          WHEN 'source.contentTypeId' THEN jsonb_build_object('role', 'collection', 'propPath', 'contentTypeId')
          WHEN 'source.listingQueryId' THEN jsonb_build_object('role', 'collection', 'propPath', 'queryId')
          WHEN 'source.limit' THEN jsonb_build_object('role', 'collection', 'propPath', 'limit')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'posts-feed' THEN CASE "binding" ->> 'propPath'
          WHEN 'source.limit' THEN jsonb_build_object('role', 'collection', 'propPath', 'limit')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'listing-filters' THEN CASE "binding" ->> 'propPath'
          WHEN 'listingQueryId' THEN jsonb_build_object('role', 'filters', 'propPath', 'queryId')
          ELSE NULL END
        WHEN "o"."ob" ->> 'type' = 'entry-teaser' THEN CASE "binding" ->> 'propPath'
          WHEN 'section.title' THEN jsonb_build_object('role', 'card', 'propPath', 'title')
          WHEN 'cta.href' THEN jsonb_build_object('role', 'card', 'propPath', 'href')
          ELSE NULL END
        ELSE NULL
      END AS "r"
    FROM "old_block" "o"
  )
  SELECT CASE
    WHEN "r"."ob_type" IN ('navigation', 'footer') THEN NULL
    WHEN "r"."r" IS NULL THEN NULL
    WHEN NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        (SELECT "_coderso_detail_page_section_v2"("r"."ob")) -> 'blocks'
      ) AS "blk"("value")
      WHERE "blk"."value" ->> 'id' =
        COALESCE(NULLIF("r"."ob" ->> 'id', ''), 'block-' || md5("r"."ob"::text))
        || '-' || replace("r"."r" ->> 'role', ':', '-')
    ) THEN NULL
    ELSE "binding" || jsonb_build_object(
      'blockId',
      COALESCE(NULLIF("r"."ob" ->> 'id', ''), 'block-' || md5("r"."ob"::text))
        || '-' || replace("r"."r" ->> 'role', ':', '-'),
      'propPath', "r"."r" ->> 'propPath'
    )
  END
  FROM "remap" "r"
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "_coderso_detail_page_document_v2"("doc" jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (jsonb_build_object(
      'schemaVersion', 2,
      'id', "doc" ->> 'id',
      'name', "doc" ->> 'name',
      'contentTypeId', "doc" ->> 'contentTypeId',
      'contentTypeSlug', "doc" ->> 'contentTypeSlug',
      'status', "doc" ->> 'status',
      'titlePattern', "doc" ->> 'titlePattern',
      'settings', "doc" -> 'settings',
      'sections', (
        SELECT COALESCE(jsonb_agg("s"."value"), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE("doc" -> 'blocks', '[]'::jsonb)) AS "b"("value")
        CROSS JOIN LATERAL (SELECT "_coderso_detail_page_section_v2"("b"."value") AS "value") AS "s"
        WHERE "s"."value" IS NOT NULL
      ),
      'bindings', (
        SELECT COALESCE(jsonb_agg("bv"."value"), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE("doc" -> 'bindings', '[]'::jsonb)) AS "b"("value")
        CROSS JOIN LATERAL (
          SELECT "_coderso_detail_page_binding_v2"("b"."value", "doc" -> 'blocks') AS "value"
        ) AS "bv"
        WHERE "bv"."value" IS NOT NULL
      )
    ))
    || CASE WHEN "doc" ? 'seo' THEN jsonb_build_object('seo', "doc" -> 'seo') ELSE '{}'::jsonb END
    || CASE WHEN "doc" ? 'related' THEN jsonb_build_object('related', "doc" -> 'related') ELSE '{}'::jsonb END
$$;
--> statement-breakpoint
UPDATE "detail_page_documents"
SET
  "current_document" = "_coderso_detail_page_document_v2"("current_document"),
  "published_document" = CASE
    WHEN "published_document" IS NULL THEN NULL
    ELSE "_coderso_detail_page_document_v2"("published_document")
  END
WHERE "current_document" ->> 'schemaVersion' IS DISTINCT FROM '2'
   OR ("published_document" IS NOT NULL AND "published_document" ->> 'schemaVersion' IS DISTINCT FROM '2');
--> statement-breakpoint
DROP FUNCTION "_coderso_detail_page_binding_v2"(jsonb, jsonb);
--> statement-breakpoint
DROP FUNCTION "_coderso_detail_page_section_v2"(jsonb);
--> statement-breakpoint
DROP FUNCTION "_coderso_detail_page_document_v2"(jsonb);
