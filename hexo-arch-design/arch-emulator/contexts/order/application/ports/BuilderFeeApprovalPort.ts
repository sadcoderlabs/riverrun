export type BuilderFeeApprovalRequest = {
  trader: string;
  allowance: bigint;
};

export interface BuilderFeeApprovalPort {
  ensureApproved(req: BuilderFeeApprovalRequest): Promise<void>;
}
