import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().optional(),
    password: z.string().min(6).max(128),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().min(1), // can be username/fullName or email
    password: z.string().min(1),
  }),
});
