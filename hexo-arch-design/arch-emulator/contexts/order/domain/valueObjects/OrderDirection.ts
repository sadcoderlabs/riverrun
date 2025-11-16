export class OrderDirection {
  private constructor(private readonly side: 'Long' | 'Short') {}

  static fromSide(side: 'Long' | 'Short'): OrderDirection {
    return new OrderDirection(side);
  }

  isLong(): boolean {
    return this.side === 'Long';
  }

  toExchangeSide(): 'buy' | 'sell' {
    return this.isLong() ? 'buy' : 'sell';
  }

  asBoolean(): boolean {
    return this.side === 'Long';
  }

  assertHasSupportedType(): void {
    if (this.side !== 'Long' && this.side !== 'Short') {
      throw new Error(`Unsupported side ${this.side}`);
    }
  }
}
