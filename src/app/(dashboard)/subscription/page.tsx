import { OptimizedSubscriptionPage } from '@/components/pricing/optimized-subscription-page';

interface Profile {
  subscription_plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export default async function PlansPage() {
  const profile: Profile | null = null;

  return <OptimizedSubscriptionPage initialProfile={profile} />;
}