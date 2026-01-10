'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { respondToTravelRequest } from '@/lib/actions';

export function RespondToRequestButtons({ requestId }: { requestId: string }) {
  const [isSubmitting, setIsSubmitting] = useState<'accept' | 'decline' | null>(null);
  const { toast } = useToast();

  const handleResponse = async (response: 'confirmed' | 'declined') => {
    setIsSubmitting(response === 'confirmed' ? 'accept' : 'decline');
    const result = await respondToTravelRequest(requestId, response);
    if (result.success) {
      toast({
        title: `Request ${response === 'confirmed' ? 'Accepted' : 'Declined'}`,
        description: `You have successfully ${response === 'confirmed' ? 'accepted' : 'declined'} the request.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: result.message,
      });
    }
    // No need to set isSubmitting back to null, as the component will re-render
  };

  return (
    <div className="flex gap-2">
      <Button onClick={() => handleResponse('confirmed')} disabled={!!isSubmitting}>
        {isSubmitting === 'accept' ? 'Accepting...' : <><CheckCircle className="mr-2 h-4 w-4" /> Accept</>}
      </Button>
      <Button variant="outline" onClick={() => handleResponse('declined')} disabled={!!isSubmitting}>
         {isSubmitting === 'decline' ? 'Declining...' : <><X className="mr-2 h-4 w-4" />Decline</>}
      </Button>
    </div>
  );
}
