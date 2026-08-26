import "server-only";

import { z } from "zod";

export const CartMutationInput = z.object({
  productId: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(0).max(99),
});

export const CheckoutInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  deviceId: z.string().uuid().nullable(),
});

export function checkoutFromFormData(
  formData: FormData,
): z.infer<typeof CheckoutInput> {
  const rawDeviceId = String(formData.get("deviceId") ?? "").trim();
  return CheckoutInput.parse({
    email: String(formData.get("email") ?? ""),
    deviceId: rawDeviceId || null,
  });
}
