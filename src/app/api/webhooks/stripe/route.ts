// Stubbed Stripe webhook route: always returns 501 Not Implemented
export async function POST() {
  return new Response('Stripe webhook endpoint is disabled.', { status: 501 });
}