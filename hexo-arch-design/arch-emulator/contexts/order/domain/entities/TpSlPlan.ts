type RawPlan = {
  take?: { trigger: number; limit?: number };
  stop?: { trigger: number; limit?: number };
};

export class TpSlPlan {
  private constructor(public readonly raw: RawPlan) {}

  static fromCommand(plan: RawPlan): TpSlPlan {
    return new TpSlPlan(plan);
  }

  assertConsistentWith(): void {
    if (this.raw.take && this.raw.take.trigger <= 0) {
      throw new Error('TP trigger should be positive');
    }
    if (this.raw.stop && this.raw.stop.trigger <= 0) {
      throw new Error('SL trigger should be positive');
    }
  }
}
