import { expect, test } from "@playwright/test";

// An address that cannot be a room code is told apart on the server (`room/[code]/not-found.tsx`),
// without asking for a name or connecting.
for (const address of ["/room/zz", "/room/ABCD"]) {
  test(`${address} says the room does not exist, with a way back`, async ({ page }) => {
    await page.goto(address);

    await expect(
      page.getByRole("heading", { level: 1, name: "Không tìm thấy phòng" }),
    ).toBeVisible();
    await expect(page.getByText(/Room\.errors/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });
}
