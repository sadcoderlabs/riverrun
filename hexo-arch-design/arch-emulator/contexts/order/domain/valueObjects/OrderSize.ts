export class OrderSize {
  private constructor(private readonly raw: string) {}

  static from(raw: string): OrderSize {
    if (!raw || Number.isNaN(Number(raw))) {
      throw new Error(`Invalid size: ${raw}`);
    }
    return new OrderSize(raw);
  }

  toString(): string {
    return this.raw;
  }

  assertNotZero(): void {
    if (parseFloat(this.raw) === 0) {
      throw new Error('Order size cannot be zero');
    }
  }

  static computeAllowance(raw: string): bigint {
    // 假裝這裡根據 size 估算需要的 builder fee allowance
    const size = BigInt(Math.ceil(parseFloat(raw) * 1e6));
    return size;
  }
}
