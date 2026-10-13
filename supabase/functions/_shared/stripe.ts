// Stripe Client initialization for Deno / Supabase Edge Functions
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  // Use recommended API version
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Catálogo de precios en menor unidad monetaria (centavos) para cada divisa
// Monedas zero-decimal en Stripe (sin centavos): CLP
export interface CurrencyRate {
  monthlyAmount: number;
  annualAmount: number;
  isZeroDecimal?: boolean;
}

export const CURRENCY_CONFIG: Record<string, CurrencyRate> = {
  MXN: { monthlyAmount: 7900, annualAmount: 66000 },       // $79.00 / $660.00 MXN
  USD: { monthlyAmount: 449, annualAmount: 3588 },          // $4.49 / $35.88 USD
  EUR: { monthlyAmount: 399, annualAmount: 3348 },          // €3.99 / €33.48 EUR
  COP: { monthlyAmount: 1800000, annualAmount: 15000000 },  // $18,000 / $150,000 COP
  PEN: { monthlyAmount: 1690, annualAmount: 14280 },        // S/ 16.90 / S/ 142.80 PEN
  CLP: { monthlyAmount: 4200, annualAmount: 34800, isZeroDecimal: true }, // $4,200 / $34,800 CLP
  ARS: { monthlyAmount: 450000, annualAmount: 3780000 },    // $4,500 / $37,800 ARS
};
