import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  createdAt: z.date().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
