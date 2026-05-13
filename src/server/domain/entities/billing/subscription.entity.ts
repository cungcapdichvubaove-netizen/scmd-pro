import { addMonths } from 'date-fns'
import type { PlanTier } from '@prisma/client'
import { GRACE_PERIOD_DAYS } from '../../../shared/constants/billing.constants.js'

export interface SubscriptionProps {
  tenantId:       string
  plan:           PlanTier
  paidUsers:      number
  activeUsers:    number
  expiresAt:      Date | null
  gracePeriodDays: number
  autoDowngrade:  boolean
}

export class SubscriptionEntity {
  constructor(readonly props: SubscriptionProps) {}

  /** Còn hạn thực sự (chưa tính grace period) */
  get isActive(): boolean {
    if (this.props.plan === 'FREE') return false
    if (!this.props.expiresAt) return false
    return this.props.expiresAt > new Date()
  }

  /** Trong grace period (hết hạn nhưng chưa quá X ngày) */
  get isInGracePeriod(): boolean {
    if (!this.props.expiresAt || this.isActive) return false
    const graceEnd = new Date(this.props.expiresAt)
    graceEnd.setDate(graceEnd.getDate() + (this.props.gracePeriodDays ?? GRACE_PERIOD_DAYS))
    return graceEnd > new Date()
  }

  /** Plan hiệu lực thực tế (tính cả grace period) */
  get effectivePlan(): PlanTier {
    if (this.isActive || this.isInGracePeriod) return this.props.plan
    return 'FREE'
  }

  get daysRemaining(): number | null {
    if (!this.props.expiresAt) return null
    const diff = this.props.expiresAt.getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  get isExpiringSoon(): boolean {
    const days = this.daysRemaining
    return days !== null && days <= 7
  }

  get isOverUserLimit(): boolean {
    return this.props.activeUsers > this.props.paidUsers
  }

  /**
   * Tính expiresAt mới khi gia hạn (date-fns để tránh edge case tháng).
   * - Còn hạn → cộng dồn từ expiresAt hiện tại
   * - Hết hạn hoặc FREE → tính từ activatedAt
   */
  calculateNewExpiry(months: number, activatedAt: Date): Date {
    const base = this.isActive && this.props.expiresAt
      ? this.props.expiresAt
      : activatedAt
    return addMonths(base, months) // date-fns xử lý end-of-month đúng
  }
}
