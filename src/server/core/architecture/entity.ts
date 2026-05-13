import { TenantId } from './types.js';

export abstract class BaseEntity<TProps> {
  protected readonly _id: string;
  protected readonly _tenantId: TenantId;
  protected _props: TProps;
  protected _createdAt: Date;
  protected _updatedAt: Date;

  constructor(props: TProps, id: string, tenantId: TenantId, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._tenantId = tenantId;
    this._props = props;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get id(): string { return this._id; }
  get tenantId(): TenantId { return this._tenantId; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // Force business logic into entities
  public abstract validateStateTransition(nextState: string): void;

  public toJSON() {
    return {
      id: this._id,
      tenantId: this._tenantId,
      ...this._props,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
