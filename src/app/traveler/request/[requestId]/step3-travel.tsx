
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type TravelRequest } from '@/lib/definitions';
import { step3Schema, type Step3FormValues } from '@/lib/schemas/travel-request';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Edit } from 'lucide-react';

export function Step3View({ request, onEdit }: { request: TravelRequest; onEdit: () => void }) {
    const { travelMedium, isTicketPrebooked, vehicleInfo, time } = request.travelMediumData || {};
  
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Step 3: Travel Medium
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <p><span className="font-semibold">Medium:</span> <span className="capitalize">{travelMedium}</span></p>
            {travelMedium !== 'car' && (
                <>
                    <p><span className="font-semibold">Ticket Booked:</span> {isTicketPrebooked}</p>
                    {isTicketPrebooked === 'yes' && vehicleInfo && (
                        <div className='pl-4'>
                            {vehicleInfo.busName && <p><span className='font-semibold'>Bus Name:</span> {vehicleInfo.busName}</p>}
                            {vehicleInfo.busNumber && <p><span className='font-semibold'>Bus Number:</span> {vehicleInfo.busNumber}</p>}
                            {vehicleInfo.trainName && <p><span className='font-semibold'>Train Name:</span> {vehicleInfo.trainName}</p>}
                            {vehicleInfo.trainNumber && <p><span className='font-semibold'>Train Number:</span> {vehicleInfo.trainNumber}</p>}
                            {vehicleInfo.flightNumber && <p><span className='font-semibold'>Flight Number:</span> {vehicleInfo.flightNumber}</p>}
                        </div>
                    )}
                    {isTicketPrebooked === 'yes' && time && (
                         <p><span className="font-semibold">Time:</span> {time}</p>
                    )}
                </>
            )}
        </CardContent>
      </Card>
    );
}
  
export function Step3Form({ request, onSave }: { request: TravelRequest; onSave: () => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<Step3FormValues>({
      resolver: zodResolver(step3Schema),
      defaultValues: request.travelMediumData || {
        travelMedium: undefined,
        isTicketPrebooked: undefined,
        vehicleInfo: { busName: '', busNumber: '', trainName: '', trainNumber: '', flightNumber: ''},
        time: '',
      },
      mode: 'onChange',
    });
  
    const watchTravelMedium = form.watch('travelMedium');
    const watchIsTicketPrebooked = form.watch('isTicketPrebooked');
  
    async function onSubmit(values: Step3FormValues) {
        if (!firestore) return;
        const requestDocRef = doc(firestore, 'travelRequests', request.id);

        if (values.isTicketPrebooked === 'yes' && values.time) {
            const { endTime } = request; // End time from Step 2
            if (endTime && values.time > endTime) {
                form.setError('time', {
                    type: 'manual',
                    message: `Arrival/Departure time cannot be after the service ends at ${endTime}.`
                });
                return; // Stop submission
            }
        }

        let cleanTravelMediumData: Partial<Step3FormValues> = { travelMedium: values.travelMedium };

        if (values.travelMedium !== 'car') {
            cleanTravelMediumData.isTicketPrebooked = values.isTicketPrebooked;
            if (values.isTicketPrebooked === 'yes') {
                cleanTravelMediumData.time = values.time;
                const vehicleInfo: any = {};
                if (values.travelMedium === 'bus') {
                    vehicleInfo.busName = values.vehicleInfo?.busName;
                    vehicleInfo.busNumber = values.vehicleInfo?.busNumber;
                } else if (values.travelMedium === 'train') {
                    vehicleInfo.trainName = values.vehicleInfo?.trainName;
                    vehicleInfo.trainNumber = values.vehicleInfo?.trainNumber;
                } else if (values.travelMedium === 'flight') {
                    vehicleInfo.flightNumber = values.vehicleInfo?.flightNumber;
                }
                cleanTravelMediumData.vehicleInfo = vehicleInfo;
            }
        }
  
      try {
        await updateDoc(requestDocRef, {
          travelMediumData: cleanTravelMediumData,
          step3Complete: true,
        });
        toast({ title: 'Step 3 Saved', description: 'Your travel details have been updated.' });
        onSave();
      } catch (error: any) {
        console.error('Failed to update travel request:', error);
        toast({ title: 'Error', description: 'Could not save your changes.', variant: 'destructive' });
      }
    }
  
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Travel Medium</CardTitle>
          <CardDescription>How are you getting to the destination city?</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="travelMedium"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travel Medium</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a travel medium..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="bus">Bus</SelectItem>
                        <SelectItem value="train">Train</SelectItem>
                        <SelectItem value="flight">Flight</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
  
              {watchTravelMedium && watchTravelMedium !== 'car' && (
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="isTicketPrebooked"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel id="ticket-prebooked-label">Is your ticket pre-booked?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                            aria-labelledby="ticket-prebooked-label"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="yes" id="ticket-yes" />
                              </FormControl>
                              <FormLabel htmlFor="ticket-yes" className="font-normal">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="no" id="ticket-no" />
                              </FormControl>
                              <FormLabel htmlFor="ticket-no" className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchIsTicketPrebooked === 'yes' && (
                    <div className="space-y-4 rounded-md border p-4">
                      {watchTravelMedium === 'bus' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="vehicleInfo.busName" render={({ field }) => (<FormItem><FormLabel>Bus Name</FormLabel><FormControl><Input placeholder="e.g., KPN Travels" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="vehicleInfo.busNumber" render={({ field }) => (<FormItem><FormLabel>Bus Number</FormLabel><FormControl><Input placeholder="e.g., TN 01 A 1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      )}
                       {watchTravelMedium === 'train' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="vehicleInfo.trainName" render={({ field }) => (<FormItem><FormLabel>Train Name</FormLabel><FormControl><Input placeholder="e.g., Pandian Express" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="vehicleInfo.trainNumber" render={({ field }) => (<FormItem><FormLabel>Train Number</FormLabel><FormControl><Input placeholder="e.g., 12638" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      )}
                      {watchTravelMedium === 'flight' && (
                        <FormField control={form.control} name="vehicleInfo.flightNumber" render={({ field }) => (<FormItem><FormLabel>Flight Number</FormLabel><FormControl><Input placeholder="e.g., 6E 2341" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      )}
                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arrival/Departure Time</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
  
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting || !watchTravelMedium}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save and Continue'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
}
