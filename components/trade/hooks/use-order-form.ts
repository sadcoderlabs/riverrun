import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z as zv3 } from 'zod/v3'; // Zod v3 compatibility layer for resolver

/**
 * Base schema for common order fields
 * Maps to Hyperliquid API order parameters:
 * - orderSide: determines 'b' (isBuy) parameter
 * - reduceOnly: maps to 'r' parameter
 */
const baseOrderSchema = zv3.object({
  orderType: zv3.enum(['Market', 'Limit', 'Scale']),
  orderSide: zv3.enum(['Long', 'Short']),
  reduceOnly: zv3.boolean(),
});

/**
 * Market order schema
 * - size: order size in base asset units, maps to 's' parameter in API
 */
const marketOrderSchema = baseOrderSchema.extend({
  orderType: zv3.literal('Market'),
  size: zv3.string(),
});

/**
 * Limit order schema
 * - limitPrice: limit price as string, maps to 'p' parameter in API
 * - size: order size in base asset units, maps to 's' parameter in API
 */
const limitOrderSchema = baseOrderSchema.extend({
  orderType: zv3.literal('Limit'),
  limitPrice: zv3.string(),
  size: zv3.string(),
});

/**
 * Discriminated union for all order types
 * Using Zod v3 for compatibility with @hookform/resolvers
 */
const orderFormSchema = zv3.discriminatedUnion('orderType', [marketOrderSchema, limitOrderSchema]);

export type OrderFormValues = zv3.infer<typeof orderFormSchema>;

interface UseOrderFormParams {
  defaultValues?: Partial<OrderFormValues>;
}

interface ValidationState {
  hasSizeZero: boolean;
  hasInvalidLimitPrice: boolean;
  isValid: boolean;
  buttonText: string;
  buttonDisabled: boolean;
}

export function useOrderForm({ defaultValues }: UseOrderFormParams) {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      orderType: 'Market',
      orderSide: 'Long',
      reduceOnly: false,
      size: '',
      ...defaultValues,
    } as OrderFormValues,
    mode: 'onChange', // Validate on change for real-time feedback
  });

  const { watch } = form;
  const orderType = watch('orderType');
  const size = watch('size');
  const limitPrice = watch('limitPrice' as any); // Type assertion needed for discriminated union

  // Validation logic
  const getValidationState = (): ValidationState => {
    const hasSizeZero = !size || size === '' || size === '0';

    // Check if limit price is invalid (empty or zero) for Limit orders
    const hasInvalidLimitPrice =
      orderType === 'Limit' && (!limitPrice || limitPrice === '' || limitPrice === '0');

    // Size = 0 and invalid limit price are allowed (will show toast on submit)
    return {
      hasSizeZero,
      hasInvalidLimitPrice,
      isValid: true,
      buttonText: 'Place Order',
      buttonDisabled: false,
    };
  };

  const validationState = getValidationState();

  return {
    form,
    validation: validationState,
  };
}
