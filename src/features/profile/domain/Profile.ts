import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  defaultAddressId: z.string().optional(),
  fcmTokens: z.array(z.object({ token: z.string(), platform: z.string().optional(), updatedAt: z.any().optional() })).optional(),
  email: z.string().email().optional().or(z.literal('')),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
