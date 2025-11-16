export interface BuilderFeeConfirmationPort {
  confirmApproval(request: { requiredFeeRateBps: number }): Promise<boolean>;
}
