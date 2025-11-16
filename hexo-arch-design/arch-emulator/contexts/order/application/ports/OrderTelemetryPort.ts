export type OrderTelemetryPayload = {
  coin: string;
  orderId?: string;
  ok: boolean;
  rejectReason?: string;
};

export interface OrderTelemetryPort {
  trackPlacedOrder(payload: OrderTelemetryPayload): Promise<void>;
}
