import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_ICONS } from './OrderStatus';
import { COLORS } from '../../../shared/theme/colors';

export const getOrderStatusMeta = (status: OrderStatus | string) => {
  const safeStatus = status as OrderStatus;
  const label = ORDER_STATUS_LABELS[safeStatus] || status.replace(/_/g, ' ');
  const icon = ORDER_STATUS_ICONS[safeStatus] || 'time';

  let color = COLORS.textSecondary;
  switch (status) {
    case 'CONFIRMED':
    case 'DELIVERED':
    case 'READY_FOR_DELIVERY':
      color = COLORS.success;
      break;
    case 'PICKUP_SCHEDULED':
    case 'PICKED_UP':
    case 'OUT_FOR_DELIVERY':
    case 'CLEANING_IN_PROGRESS':
      color = COLORS.vibrantYellow;
      break;
    case 'CANCELLED':
    case 'REFUNDED':
    case 'REFUND_PENDING':
      color = '#FF3B30';
      break;
    case 'PAYMENT_PENDING':
    default:
      color = COLORS.textSecondary;
      break;
  }

  return { label, icon, color };
};
