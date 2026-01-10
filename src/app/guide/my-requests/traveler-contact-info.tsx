
'use client';

import { useEffect, useState } from 'react';
import { differenceInHours, parseISO } from 'date-fns';
import { Phone } from 'lucide-react';
import type { User } from '@/lib/definitions';

interface TravelerContactInfoProps {
  contact: User['contact'];
  tripStartTime: string;
}

export function TravelerContactInfo({ contact, tripStartTime }: TravelerContactInfoProps) {
  const [canShowContact, setCanShowContact] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      try {
        const tripDate = parseISO(tripStartTime);
        if (isNaN(tripDate.getTime())) {
          setCanShowContact(false);
          return;
        }
        const now = new Date();
        const hoursUntilTrip = differenceInHours(tripDate, now);
        
        // Show contact info if the trip is within the next 24 hours
        setCanShowContact(hoursUntilTrip <= 24);
      } catch (error) {
        console.error("Error parsing trip start time:", error);
        setCanShowContact(false);
      }
    };

    checkTime();
    // Set up an interval to re-check, e.g., every 5 minutes
    const interval = setInterval(checkTime, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tripStartTime]);

  if (canShowContact) {
    return (
      <div className="pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <a href={`tel:${contact?.primaryPhone}`} className="text-primary underline hover:no-underline">
            {contact?.primaryPhone}
          </a>
          {contact?.whatsappNumber && (
            <a 
              href={`https://wa.me/${contact.whatsappNumber}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-green-600 underline hover:no-underline"
            >
              (WhatsApp)
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <p className="text-xs text-muted-foreground italic">
        Traveler's contact details will be revealed 24 hours before the trip.
      </p>
    </div>
  );
}
