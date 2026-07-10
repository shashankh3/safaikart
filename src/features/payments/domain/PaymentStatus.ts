export type PaymentStatus =
  | 'NOT_STARTED'
  | 'CREATED'
  | 'PENDING'
  | 'CLIENT_CALLBACK_RECEIVED'
  | 'WEBHOOK_RECEIVED'
  | 'VERIFIED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export function isPaymentSuccess(status: PaymentStatus): boolean {
  return status === 'VERIFIED';
}

export function isPaymentFailed(status: PaymentStatus): boolean {
  return status === 'FAILED' || status === 'CANCELLED';
}

export function isPaymentPending(status: PaymentStatus): boolean {
  return (
    status === 'NOT_STARTED' ||
    status === 'CREATED' ||
    status === 'PENDING' ||
    status === 'CLIENT_CALLBACK_RECEIVED' ||
    status === 'WEBHOOK_RECEIVED'
  );
}
