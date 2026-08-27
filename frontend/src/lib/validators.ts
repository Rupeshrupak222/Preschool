import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).max(15),
  classLevel: z.string().min(1),
  schoolName: z.string().min(2, "School name is required"),
  password: z.string().min(8),
  captcha: z.literal("ADYAPAN"),
  source: z.enum(["web", "mobile", "app"]).optional().default("web")
});

export const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8).max(15).optional().or(z.literal("")),
  classLevel: z.string().min(1).optional().or(z.literal("")),
  schoolName: z.string().max(190).optional().or(z.literal(""))
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  captcha: z.string().min(1),
  source: z.enum(["web", "mobile", "app"]).optional().default("web")
});



export const principalLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  schoolKey: z.string().trim().min(8),
  captcha: z.string().min(1)
});

export const teacherLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  staffKey: z.string().trim().min(8),
  captcha: z.string().min(1)
});

export const leadSchema = z.object({
  type: z.enum(["demo", "school", "newsletter"]),
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  school: z.string().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
  classLevel: z.string().optional(),
  interest: z.string().optional()
});

export const paymentOrderSchema = z.object({
  plan: z.string().min(2),
  amount: z.number().positive(),
  userEmail: z.string().email()
});

export const paymentVerifySchema = z.object({
  orderId: z.string().min(2),
  paymentId: z.string().min(2),
  signature: z.string().min(2),
  plan: z.string().min(2),
  userEmail: z.string().email()
});
