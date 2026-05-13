import { BaseEntity } from '../../../core/architecture/entity.js';
import { TenantId } from '../../../core/architecture/types.js';

export interface StaffProps {
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  status: string;
  password?: string;
  qualifications?: string[];
  idNumber?: string | null;
  licenseNumber?: string | null;
  idExpiry?: Date | null;
}

export class StaffEntity extends BaseEntity<StaffProps> {
  static create(id: string, tenantId: TenantId, props: StaffProps, createdAt?: Date, updatedAt?: Date) {
    return new StaffEntity(props, id, tenantId, createdAt, updatedAt);
  }

  get username(): string { return this._props.username; }
  get email(): string { return this._props.email; }
  get fullName(): string { return this._props.fullName; }
  get phone(): string | undefined | null { return this._props.phone; }
  get role(): string { return this._props.role; }
  get status(): string { return this._props.status; }
  get password(): string | undefined { return this._props.password; }
  get qualifications(): string[] { return this._props.qualifications || []; }
  get idNumber(): string | undefined | null { return this._props.idNumber; }
  get licenseNumber(): string | undefined | null { return this._props.licenseNumber; }
  get idExpiry(): Date | undefined | null { return this._props.idExpiry; }

  public deactivate(): void {
    if (this._props.status === 'inactive') {
      throw new Error('Staff is already inactive');
    }
    this._props.status = 'inactive';
    this._updatedAt = new Date();
  }

  public activate(): void {
    if (this._props.status === 'active') {
      throw new Error('Staff is already active');
    }
    this._props.status = 'active';
    this._updatedAt = new Date();
  }

  public updateProfile(
    fullName: string, 
    role?: string, 
    phone?: string | null, 
    idNumber?: string | null, 
    licenseNumber?: string | null, 
    idExpiry?: Date | null
  ): void {
    if (!fullName || fullName.trim() === '') {
      throw new Error('Full name cannot be empty');
    }
    this._props.fullName = fullName;
    if (role) {
      this._props.role = role;
    }
    if (phone !== undefined) {
      this._props.phone = phone;
    }
    if (idNumber !== undefined) {
      this._props.idNumber = idNumber;
    }
    if (licenseNumber !== undefined) {
      this._props.licenseNumber = licenseNumber;
    }
    if (idExpiry !== undefined) {
      this._props.idExpiry = idExpiry;
    }
    this._updatedAt = new Date();
  }

  public updateQualifications(qualifications: string[]): void {
    this._props.qualifications = qualifications;
    this._updatedAt = new Date();
  }

  public validateStateTransition(nextState: string): void {
    const validStates = ['active', 'inactive'];
    if (!validStates.includes(nextState)) {
      throw new Error(`Invalid state transition: ${nextState}`);
    }
  }

  public getProps() {
    return this._props;
  }
  
  // FIX 5.1: Chống rò rỉ Password hash qua các truy vấn GET / PUT
  // Ghi đè phương thức toJSON() của lớp BaseEntity để loại bỏ password
  public override toJSON(): Omit<ReturnType<BaseEntity<StaffProps>['toJSON']>, 'password'> {
    const { password, ...safeProps } = this._props;
    return {
      id: this._id,
      tenantId: this._tenantId,
      ...safeProps,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }
}
