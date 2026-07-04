CREATE OR REPLACE FUNCTION "_coderso_custom_screen_block_v4"("block" jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'id', COALESCE(NULLIF("block" ->> 'id', ''), 'block-' || md5("block"::text)),
      'type', CASE "block" ->> 'type'
        WHEN 'screen-field-value' THEN 'field'
        WHEN 'screen-field-group' THEN 'field-group'
        WHEN 'screen-record-header' THEN 'record-header'
        WHEN 'screen-two-column' THEN 'columns'
        ELSE 'legacy-widget'
      END,
      'label', NULLIF("block" ->> 'label', ''),
      'variant', NULLIF("block" ->> 'variant', ''),
      'legacyWidgetType', CASE
        WHEN "block" ->> 'type' IN (
          'screen-field-value',
          'screen-field-group',
          'screen-record-header',
          'screen-two-column'
        ) THEN NULL
        ELSE NULLIF("block" ->> 'type', '')
      END,
      'data', CASE
        WHEN jsonb_typeof("block" -> 'data') = 'object' THEN "block" -> 'data'
        ELSE '{}'::jsonb
      END,
      'layout', CASE WHEN "block" ? 'layout' THEN "block" -> 'layout' ELSE NULL END,
      'visibility', CASE WHEN "block" ? 'visibility' THEN "block" -> 'visibility' ELSE NULL END,
      'editor', CASE WHEN "block" ? 'editor' THEN "block" -> 'editor' ELSE NULL END,
      'children', CASE
        WHEN jsonb_typeof("block" -> 'children') = 'array' THEN (
          SELECT COALESCE(jsonb_agg("_coderso_custom_screen_block_v4"("child"."value")), '[]'::jsonb)
          FROM jsonb_array_elements("block" -> 'children') AS "child"("value")
        )
        ELSE NULL
      END,
      'slots', CASE
        WHEN jsonb_typeof("block" -> 'slots') = 'object' THEN (
          SELECT COALESCE(
            jsonb_object_agg(
              "slot"."key",
              CASE
                WHEN jsonb_typeof("slot"."value") = 'array' THEN (
                  SELECT COALESCE(
                    jsonb_agg("_coderso_custom_screen_block_v4"("slot_block"."value")),
                    '[]'::jsonb
                  )
                  FROM jsonb_array_elements("slot"."value") AS "slot_block"("value")
                )
                ELSE '[]'::jsonb
              END
            ),
            '{}'::jsonb
          )
          FROM jsonb_each("block" -> 'slots') AS "slot"("key", "value")
        )
        ELSE NULL
      END
    )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "_coderso_custom_screen_binding_v4"("binding" jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'id', COALESCE(
        NULLIF("binding" ->> 'id', ''),
        concat_ws(
          '-',
          COALESCE("binding" ->> 'blockId', "binding" ->> 'widgetId', 'binding'),
          COALESCE("binding" ->> 'propPath', 'value')
        )
      ),
      'blockId', COALESCE("binding" ->> 'blockId', "binding" ->> 'widgetId'),
      'propPath', "binding" ->> 'propPath',
      'source', COALESCE(NULLIF("binding" ->> 'source', ''), 'entry'),
      'field', "binding" ->> 'field',
      'mode', COALESCE(NULLIF("binding" ->> 'mode', ''), 'read')
    )
  );
$$;
--> statement-breakpoint
ALTER TABLE "custom_screens" ALTER COLUMN "schema_version" SET DEFAULT 4;
--> statement-breakpoint
UPDATE "custom_screens"
SET
  "schema_version" = 4,
  "definition" = jsonb_build_object(
    'schemaVersion', 4,
    'listView', jsonb_build_object(
      'columns', CASE
        WHEN jsonb_typeof("definition" #> '{listView,columns}') = 'array'
          THEN "definition" #> '{listView,columns}'
        ELSE jsonb_build_array(
          jsonb_build_object(
            'id', 'system-title',
            'source', 'system',
            'field', 'title',
            'label', 'Record',
            'formatter', 'text',
            'visible', true
          ),
          jsonb_build_object(
            'id', 'system-updatedat',
            'source', 'system',
            'field', 'updatedAt',
            'label', 'Updated',
            'formatter', 'date',
            'visible', true
          )
        )
      END,
      'filters', CASE
        WHEN jsonb_typeof("definition" #> '{listView,filters}') = 'array'
          THEN "definition" #> '{listView,filters}'
        ELSE '[]'::jsonb
      END,
      'defaultSort', CASE
        WHEN jsonb_typeof("definition" #> '{listView,defaultSort}') = 'object'
          THEN "definition" #> '{listView,defaultSort}'
        ELSE jsonb_build_object('field', 'updatedAt', 'direction', 'desc')
      END,
      'bulkActions', CASE
        WHEN jsonb_typeof("definition" #> '{listView,bulkActions}') = 'object'
          THEN "definition" #> '{listView,bulkActions}'
        ELSE jsonb_build_object('delete', true, 'publish', true, 'unpublish', true)
      END
    ),
    'editorView', jsonb_build_object(
      'document', jsonb_build_object(
        'schemaVersion', 1,
        'sections', CASE
          WHEN jsonb_typeof("definition" #> '{editorView,document,sections}') = 'array'
            THEN "definition" #> '{editorView,document,sections}'
          WHEN jsonb_typeof("definition" #> '{editorView,blocks}') = 'array'
            THEN jsonb_build_array(
              jsonb_build_object(
                'id', 'section-default',
                'type', 'section',
                'label', 'Details',
                'data', jsonb_build_object('title', 'Details'),
                'blocks', (
                  SELECT COALESCE(
                    jsonb_agg("_coderso_custom_screen_block_v4"("block"."value")),
                    '[]'::jsonb
                  )
                  FROM jsonb_array_elements("definition" #> '{editorView,blocks}') AS "block"("value")
                )
              )
            )
          WHEN jsonb_typeof("blocks") = 'array'
            THEN jsonb_build_array(
              jsonb_build_object(
                'id', 'section-default',
                'type', 'section',
                'label', 'Details',
                'data', jsonb_build_object('title', 'Details'),
                'blocks', (
                  SELECT COALESCE(
                    jsonb_agg("_coderso_custom_screen_block_v4"("block"."value")),
                    '[]'::jsonb
                  )
                  FROM jsonb_array_elements("blocks") AS "block"("value")
                )
              )
            )
          ELSE '[]'::jsonb
        END
      ),
      'bindings', CASE
        WHEN jsonb_typeof("definition" #> '{editorView,bindings}') = 'array' THEN (
          SELECT COALESCE(
            jsonb_agg("_coderso_custom_screen_binding_v4"("binding"."value")),
            '[]'::jsonb
          )
          FROM jsonb_array_elements("definition" #> '{editorView,bindings}') AS "binding"("value")
          WHERE COALESCE("binding"."value" ->> 'blockId', "binding"."value" ->> 'widgetId') IS NOT NULL
            AND "binding"."value" ->> 'propPath' IS NOT NULL
            AND "binding"."value" ->> 'field' IS NOT NULL
        )
        WHEN jsonb_typeof("bindings") = 'array' THEN (
          SELECT COALESCE(
            jsonb_agg("_coderso_custom_screen_binding_v4"("binding"."value")),
            '[]'::jsonb
          )
          FROM jsonb_array_elements("bindings") AS "binding"("value")
          WHERE COALESCE("binding"."value" ->> 'blockId', "binding"."value" ->> 'widgetId') IS NOT NULL
            AND "binding"."value" ->> 'propPath' IS NOT NULL
            AND "binding"."value" ->> 'field' IS NOT NULL
        )
        ELSE '[]'::jsonb
      END,
      'saveMode', 'entry',
      'interactionMode', 'inline'
    )
  )
WHERE "definition" IS NULL
   OR "schema_version" <> 4
   OR "definition" ->> 'schemaVersion' IS DISTINCT FROM '4';
--> statement-breakpoint
ALTER TABLE "custom_screens" ALTER COLUMN "definition" SET NOT NULL;
--> statement-breakpoint
DROP FUNCTION "_coderso_custom_screen_binding_v4"(jsonb);
--> statement-breakpoint
DROP FUNCTION "_coderso_custom_screen_block_v4"(jsonb);
