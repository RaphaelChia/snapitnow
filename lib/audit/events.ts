export const SESSION_AUDIT_EVENTS = {
  CREATED: "session.created",
  DELETED: "session.deleted",
  ACTIVATION_CHECKOUT_STARTED: "session.activation.checkout_started",
  ACTIVATED_PAYMENT_SUCCEEDED: "session.activated.payment_succeeded",
  ENDED_MANUAL: "session.ended.manual",
  ENDED_AUTO_WEDDING_CUTOFF: "session.ended.auto_wedding_cutoff",
  WEDDING_DATE_UPDATED: "session.wedding_date.updated",
  FILTER_UPDATED: "session.filter.updated",
  EXPIRED_ADMIN_FORCE: "session.expired.admin_force",
  REACTIVATED_ADMIN_FORCE: "session.reactivated.admin_force",
} as const

export type SessionAuditEventType =
  (typeof SESSION_AUDIT_EVENTS)[keyof typeof SESSION_AUDIT_EVENTS]
