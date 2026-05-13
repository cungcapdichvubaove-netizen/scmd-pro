import { z } from 'zod';

export const staffRoleSchema = z.enum(['super-admin', 'tenant-admin', 'supervisor', 'guard', 'technician']);

export const staffSchema = z.object({
  username: z.string()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(20, "Tên đăng nhập tối đa 20 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ bao gồm chữ cái, số và dấu gạch dưới"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  email: z.string().email("Địa chỉ email không hợp lệ").toLowerCase(),
  fullName: z.string()
    .min(2, "Họ tên quá ngắn")
    .max(100, "Họ tên quá dài"),
  phone: z.string()
    .regex(/^[0-9+ ]+$/, "Số điện thoại không hợp lệ")
    .min(10, "Số điện thoại tối thiểu 10 số")
    .max(15, "Số điện thoại tối đa 15 số")
    .optional()
    .nullable(),
  role: staffRoleSchema,
  tenantId: z.string().uuid("Tenant ID không hợp lệ"),
  qualifications: z.array(z.string()).optional(),
  idNumber: z.string().max(20, "Số CMND/CCCD tối đa 20 ký tự").optional().nullable(),
  licenseNumber: z.string().max(50, "Số giấy phép tối đa 50 ký tự").optional().nullable(),
  idExpiry: z.string().optional().nullable(), // Will be parsed to Date
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  tokenVersion: z.number().default(1),
});

export const createStaffSchema = staffSchema;
export const updateStaffSchema = staffSchema.partial().omit({ 
  tenantId: true, 
  tokenVersion: true,
  password: true 
});

export type Staff = z.infer<typeof staffSchema> & { id: string, createdAt?: Date, updatedAt?: Date };
export type CreateStaffData = z.infer<typeof createStaffSchema>;
export type UpdateStaffData = z.infer<typeof updateStaffSchema>;
