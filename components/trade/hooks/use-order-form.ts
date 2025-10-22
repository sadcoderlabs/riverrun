import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z as zv3 } from 'zod/v3'; // Zod v3 compatibility layer for resolver

/**
 * Order form schema
 * Maps to Hyperliquid API order parameters:
 * - orderSide: determines 'b' (isBuy) parameter
 * - reduceOnly: maps to 'r' parameter
 * - size: order size in base asset units, maps to 's' parameter
 * - limitPrice: limit price (only for Limit orders), maps to 'p' parameter
 */
const orderFormSchema = zv3.object({
  orderType: zv3.enum(['Market', 'Limit']),
  orderSide: zv3.enum(['Long', 'Short']),
  reduceOnly: zv3.boolean(),
  size: zv3.string(),
  limitPrice: zv3.string().optional(),
});

export type OrderFormValues = zv3.infer<typeof orderFormSchema>;

interface UseOrderFormParams {
  defaultValues?: Partial<OrderFormValues>;
}

interface ValidationState {
  hasValidSize: boolean;
  hasValidLimitPrice: boolean;
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
      limitPrice: '',
      ...defaultValues,
    },
    mode: 'onSubmit',
  });

  const { control } = form;

  // Use useWatch to properly subscribe to form value changes
  const orderType = useWatch({ control, name: 'orderType' });
  const size = useWatch({ control, name: 'size' });
  const limitPrice = useWatch({ control, name: 'limitPrice' });

  // Validation logic
  const getValidationState = (): ValidationState => {
    // Check if size is valid (not empty, not zero)
    const hasValidSize = !!(size && size !== '' && size !== '0');

    // Check if limit price is valid for Limit orders
    const hasValidLimitPrice =
      orderType === 'Market' || !!(limitPrice && limitPrice !== '' && limitPrice !== '0');

    // Input fields accept empty or zero values, validation only shows toast on submit
    return {
      hasValidSize,
      hasValidLimitPrice,
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
