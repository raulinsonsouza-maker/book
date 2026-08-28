export function createDemoPixPayment(idempotencyKey: string) {
  const payload = `00020126580014br.gov.bcb.pix0136${idempotencyKey}5204000053039865802BR5913Book Symbius6009SAO PAULO62070503***6304ABCD`;
  return {
    id: `demo_${idempotencyKey}`,
    status: "pending",
    qrCode: payload,
    qrCodeBase64: "",
    demo: true as const,
  };
}

export function createDemoCardPayment(idempotencyKey: string) {
  return {
    id: `demo_card_${idempotencyKey}`,
    status: "paid",
    demo: true as const,
  };
}

export function isDemoPaymentId(id: string | null | undefined) {
  return Boolean(id?.startsWith("demo_"));
}
