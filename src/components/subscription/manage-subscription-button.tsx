'use client';

import { Button } from '@/components/ui/button';

export default function ManageSubscriptionButton() {
  const handleManageSubscription = async () => {
    try {
      // Handle subscription management
    } catch (error) {
      // Handle error silently
      void error
    }
  };

  return (
    <Button 
      onClick={handleManageSubscription}
      variant="outline"
    >
      Manage Subscription
    </Button>
  );
}