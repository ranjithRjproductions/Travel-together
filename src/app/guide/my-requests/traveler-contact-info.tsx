
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
  const [hoursUntilTrip, setHoursUntilTrip] = useState<number | null>(null);

  useEffect(() => {
    const checkTime = () => {
      try {
        const tripDate = parseISO(tripStartTime);
        if (isNaN(tripDate.getTime())) {
          setHoursUntilTrip(null);
          return;
        }
        const now = new Date();
        const hoursDifference = differenceInHours(tripDate, now);
        setHoursUntilTrip(hoursDifference);
      } catch (error) {
        console.error("Error parsing trip start time:", error);
        setHoursUntilTrip(null);
      }
    };

    checkTime();
    // Set up an interval to re-check, e.g., every 5 minutes
    const interval = setInterval(checkTime, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tripStartTime]);

  const canShowContact = hoursUntilTrip !== null && hoursUntilTrip <= 24;

  if (canShowContact) {
    return (
      <div className="pt-2 space-y-2">
        <p className="text-sm text-primary font-semibold">
            Your service will begin in {hoursUntilTrip < 1 ? 'less than an hour' : `${hoursUntilTrip} hours`}.
        </p>
        <p className="text-sm text-muted-foreground">
            Please contact our traveler to ensure a comfortable journey and provide assistance.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4" />
          <a href={`tel:${contact?.primaryPhone}`} className="text-primary underline hover:no-underline font-medium">
            {contact?.primaryPhone}
          </a>
          {contact?.whatsappNumber && (
            <a 
              href={`https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-green-600 underline hover:no-underline font-medium"
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
