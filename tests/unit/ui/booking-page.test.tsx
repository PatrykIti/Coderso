import { expect, test } from "bun:test";

import { BookingPage } from "../../../core/admin/ui/booking/BookingPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("BookingPage renders booking shell and tabs", () => {
  const html = renderAdminUi(<BookingPage />, {
    path: "/admin/coderso/booking",
  });

  expect(html).toContain("Booking");
  expect(html).toContain("Resources");
  expect(html).toContain("Services");
  expect(html).toContain("Availability");
  expect(html).toContain("Reservations");
  expect(html).toContain("Slot Preview");
  expect(html).toContain("Loading resources");
});
