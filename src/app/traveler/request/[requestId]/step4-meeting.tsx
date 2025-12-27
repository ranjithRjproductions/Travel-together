'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type TravelRequest } from '@/lib/definitions';
import { step4Schema, type Step4FormValues } from '@/lib/schemas/travel-request';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit } from 'lucide-react';

export function Step4View({ request, onEdit }: { request: TravelRequest; onEdit: () => void }) {
  const { pickupType, hotelDetails, stationName, pickupTime } = request.pickupData || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Step 4: Meeting Point
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><span className="font-semibold">Meeting Point:</span> <span className="capitalize">{pickupType?.replace(/_/g, ' ')}</span></p>
        {pickupType !== 'destination' && pickupTime && (
            <p><span className="font-semibold">Pickup Time:</span> {pickupTime}</p>
        )}
        {pickupType === 'hotel' && hotelDetails && (
          <div className="pl-4">
            <p><span className="font-semibold">Hotel Name:</span> {hotelDetails.name}</p>
            {hotelDetails.roomNumber && <p><span className="font-semibold">Room Number:</span> {hotelDetails.roomNumber}</p>}
          </div>
        )}
        {pickupType && ['bus_stand', 'railway_station', 'airport'].includes(pickupType) && stationName && (
          <p><span className="font-semibold">Location Name:</span> {stationName}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function Step4Form({ request, onSave }: { request: TravelRequest; onSave: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<Step4FormValues>({
    resolver: zodResolver(step4Schema),
    defaultValues: request.pickupData || {
      pickupType: undefined,
      hotelDetails: { name: '', roomNumber: '' },
      stationName: '',
      pickupTime: '',
    },
    mode: 'onChange',
  });

  const watchPickupType = form.watch('pickupType');

  async function onSubmit(values: Step4FormValues) {
    if (!firestore) return;
    const requestDocRef = doc(firestore, 'travelRequests', request.id);
    
    const serviceStartTime = request.startTime;
    if (values.pickupType !== 'destination' && values.pickupTime && serviceStartTime && values.pickupTime > serviceStartTime) {
        form.setError('pickupTime', {
            type: 'manual',
            message: `Pickup time must be before the service starts at ${serviceStartTime}.`
        });
        return;
    }
    
    if (values.pickupTime && request.endTime && values.pickupTime > request.endTime) {
         form.setError('pickupTime', {
            type: 'manual',
            message: `Pickup time cannot be after the service ends at ${request.endTime}.`
        });
        return;
    }

    let cleanPickupData: Partial<Step4FormValues> = { pickupType: values.pickupType };

    if (values.pickupType === 'hotel') {
        cleanPickupData.hotelDetails = values.hotelDetails;
    } else if (values.pickupType && ['bus_stand', 'railway_station', 'airport'].includes(values.pickupType)) {
        cleanPickupData.stationName = values.stationName;
    }

    if (values.pickupType !== 'destination') {
        cleanPickupData.pickupTime = values.pickupTime;
    }

    try {
      await updateDoc(requestDocRef, {
        pickupData: cleanPickupData,
        step4Complete: true,
      });
      toast({ title: 'Step 4 Saved', description: 'Your meeting point details have been updated.' });
      onSave();
    } catch (error: any) {
      console.error('Failed to update travel request:', error);
      toast({ title: 'Error', description: 'Could not save your changes.', variant: 'destructive' });
    }
  }

  const travelMedium = request.travelMediumData?.travelMedium;
  const pickupOptions = [
    { value: 'destination', label: 'At the Destination' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'bus_stand', label: 'Bus Stand' },
    { value: 'railway_station', label: 'Railway Station' },
    { value: 'airport', label: 'Airport', disabled: travelMedium !== 'flight' },
  ].filter(opt => !opt.disabled);

  const getStationLabel = () => {
    switch (watchPickupType) {
        case 'bus_stand': return 'Bus Stand Name';
        case 'railway_station': return 'Railway Station Name';
        case 'airport': return 'Airport Name';
        default: return 'Location Name';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Meeting Point</CardTitle>
        <CardDescription>Where should your guide meet you?</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="pickupType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Location</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a meeting point..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pickupOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchPickupType && watchPickupType !== 'destination' && (
                <div className="space-y-4 pt-4 border-t">
                    <FormField control={form.control} name="pickupTime" render={({ field }) => (<FormItem><FormLabel>Pickup Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            )}

            {watchPickupType === 'hotel' && (
              <div className="space-y-4 pt-4 border-t">
                <FormField control={form.control} name="hotelDetails.name" render={({ field }) => (<FormItem><FormLabel>Hotel Name</FormLabel><FormControl><Input placeholder="e.g., Hotel Sangam" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="hotelDetails.roomNumber" render={({ field }) => (<FormItem><FormLabel>Room Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., 204" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            )}
            
            {watchPickupType && ['bus_stand', 'railway_station', 'airport'].includes(watchPickupType) && (
                 <div className="space-y-4 pt-4 border-t">
                    <FormField control={form.control} name="stationName" render={({ field }) => (<FormItem><FormLabel>{getStationLabel()}</FormLabel><FormControl><Input placeholder="e.g., Madurai Junction" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting || !watchPickupType}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save and Continue'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
