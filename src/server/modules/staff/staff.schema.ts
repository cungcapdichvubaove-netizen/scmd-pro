import { z } from 'zod';

export const staffRoleSchema = z.enum(['super-admin', 'tenant-admin', 'supervisor', 'guard', 'technician', 'vendor-commander', 'vendor-representative']);

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
  staffId: z.string()
    .trim()
    .min(1, "Mã nhân viên không được rỗng")
    .max(50, "Mã nhân viên tối đa 50 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã nhân viên chỉ gồm chữ, số, gạch nối hoặc gạch dưới")
    .optional()
    .nullable(),
  phone: z.string()
    .regex(/^[0-9+ ]+$/, "Số điện thoại không hợp lệ")
    .min(10, "Số điện thoại tối thiểu 10 số")
    .max(15, "Số điện thoại tối đa 15 số")
    .optional()
    .nullable(),
  role: staffRoleSchema,
  assignedVendorId: z.string().optional().nullable(),
  assignedSiteId: z.string().optional().nullable(),
  assignedContractId: z.string().optional().nullable(),
  // FIX [TENANT-ID-ROOT-CAUSE]: Bỏ .uuid() constraint.
  // Hệ thống dùng 2 loại tenantId hợp lệ:
  //   1. Trial tenant: crypto.randomUUID() → UUID format (pass uuid())
  //   2. Seed/demo tenant: 'tenant_vinhomes', 'tenant_system' → NON-UUID string (fail uuid())
  // DB schema định nghĩa tenant_id là TEXT (không enforce UUID tại DB layer).
  // RLS policy dùng string equality — không yêu cầu UUID format.
  // tenantId KHÔNG bao giờ đến từ client (đã bị omit ở createStaffSchema/updateStaffSchema).
  // tenantId chỉ được inject server-side từ ctx.tenantId (JWT-trusted) tại controller/repository.
  // → uuid() constraint là sai so với thiết kế thực tế → gây HTTP 400 với MỌI seed tenant.
  tenantId: z.string().min(1, "Tenant ID không được rỗng"),
  qualifications: z.array(z.string()).optional(),
  idNumber: z.string().max(20, "Số CMND/CCCD tối đa 20 ký tự").optional().nullable(),
  licenseNumber: z.string().max(50, "Số giấy phép tối đa 50 ký tự").optional().nullable(),
  idExpiry: z.string().optional().nullable(), // Will be parsed to Date
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  tokenVersion: z.number().default(1),
});

// createStaffSchema KHÔNG nhận tenantId từ client.
// tenantId là server-side context — inject tại controller từ SecurityContext.
// staffSchema (full) vẫn được dùng tại usecase/repository layer (tenantId đã được inject).
export const createStaffSchema = staffSchema.omit({ tenantId: true, tokenVersion: true });
export const updateStaffSchema = staffSchema.partial().omit({
  tenantId: true,
  tokenVersion: true,
}).extend({
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").optional(),
});

export type Staff = z.infer<typeof staffSchema> & { id: string, createdAt?: Date, updatedAt?: Date };
export type CreateStaffData = z.infer<typeof createStaffSchema>;
export type UpdateStaffData = z.infer<typeof updateStaffSchema>;
