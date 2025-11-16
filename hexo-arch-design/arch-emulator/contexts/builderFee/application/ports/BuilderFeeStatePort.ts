export type BuilderFeeStatus = {
  isApproved: boolean;
  maxApprovedFeeBps: number;
};

export interface BuilderFeeStatePort {
  updateStatus(status: BuilderFeeStatus): void;
}
