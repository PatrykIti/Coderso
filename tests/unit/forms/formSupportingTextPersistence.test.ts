import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  createForm,
  deleteForm,
  getForm,
  updateForm,
} from "../../../core/services/forms/formsService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

testIfDb(
  "submit supporting text round-trips and stays present-only when cleared",
  async () => {
    const fixtureId = randomUUID();
    const form = await createForm({
      name: `Supporting text ${fixtureId}`,
      slug: `supporting-text-${fixtureId}`,
    });
    if (!form) throw new Error("form_fixture_create_failed");

    try {
      await updateForm(form.id, {
        settings: {
          theme: {
            submit: {
              label: "Wyślij brief",
              supportingText:
                "  Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej presji.  ",
            },
          },
        },
      });
      const persisted = await getForm(form.id);
      expect((persisted?.settings as { theme?: unknown }).theme).toEqual({
        submit: {
          label: "Wyślij brief",
          supportingText:
            "Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej presji.",
        },
      });

      await updateForm(form.id, {
        settings: {
          theme: {
            submit: {
              label: "Wyślij brief",
              supportingText: "   ",
            },
          },
        },
      });
      const cleared = await getForm(form.id);
      expect((cleared?.settings as { theme?: unknown }).theme).toEqual({
        submit: {
          label: "Wyślij brief",
        },
      });
    } finally {
      await deleteForm(form.id);
    }
  },
  360_000
);
