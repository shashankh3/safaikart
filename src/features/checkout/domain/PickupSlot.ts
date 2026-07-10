export type PickupSlot = {
  id: string;
  date: string;          // "2026-07-12"
  startTime: string;     // "10:00"
  endTime: string;       // "12:00"
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  serviceArea: string;
  available: boolean;    // bookedCount < capacity && isActive
  displayLabel: string;  // "10:00 AM - 12:00 PM"
  dateLabel: string;     // "Sat, 12 Jul" (formatted)
  spotsLeft: number;     // capacity - bookedCount
};
