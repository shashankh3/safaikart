export function buildOrderNotification(before: any, after: any, orderId: string): { title: string, body: string, type: string } | null {
  const shortId = orderId.substring(0, 4).toUpperCase();
  
  // Status change triggers
  if (before.status !== after.status) {
    switch (after.status) {
      case 'CONFIRMED':
        return {
          title: 'Order Confirmed',
          body: `Order #SK-${shortId} confirmed! Pickup: ${after.pickupSlotSnapshot?.date || 'soon'}.`,
          type: 'order_update'
        };
      case 'PICKUP_SCHEDULED':
        return {
          title: 'Pickup Scheduled',
          body: `Driver assigned for order #SK-${shortId}. They will arrive at the scheduled time.`,
          type: 'order_update'
        };
      case 'PICKED_UP':
        return {
          title: 'Order Picked Up',
          body: `Items picked up for order #SK-${shortId}. Cleaning in progress.`,
          type: 'order_update'
        };
      case 'CLEANING_IN_PROGRESS':
        return {
          title: 'Cleaning in Progress',
          body: `Your items are being cleaned. We'll notify you when they're ready.`,
          type: 'order_update'
        };
      case 'READY_FOR_DELIVERY':
        return {
          title: 'Ready for Delivery',
          body: `Items ready for delivery! Order #SK-${shortId}.`,
          type: 'order_update'
        };
      case 'OUT_FOR_DELIVERY':
        return {
          title: 'Out for Delivery',
          body: `Your order #SK-${shortId} is out for delivery. Expected soon.`,
          type: 'order_update'
        };
      case 'DELIVERED':
        return {
          title: 'Order Delivered',
          body: `Order #SK-${shortId} delivered! Thank you for choosing SafaiKart.`,
          type: 'order_update'
        };
      case 'CANCELLED':
        return {
          title: 'Order Cancelled',
          body: `Your order #SK-${shortId} was cancelled.`,
          type: 'order_cancelled'
        };
    }
  }

  // Refund Initiated
  if (before.refundStatus !== 'INITIATED' && after.refundStatus === 'INITIATED') {
    return {
      title: 'Refund Initiated',
      body: `A refund for order #SK-${shortId} has been initiated. It should reflect in 5-7 days.`,
      type: 'order_update'
    };
  }
  
  // Top-up requested / Price Confirmed
  if (!before.priceConfirmed && after.priceConfirmed && after.paymentStatus === 'PAYMENT_PENDING' && after.finalAmountMinor > before.finalAmountMinor) {
    return {
      title: 'Action Required: Top-up Payment',
      body: `Price confirmed for order #SK-${shortId}. An additional payment is required to proceed.`,
      type: 'payment_required'
    };
  }

  return null;
}
