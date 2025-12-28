'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, parseISO } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type TravelRequest } from '@/lib/definitions';
import { step2Schema, type Step2FormValues } from '@/lib/schemas/travel-request';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Step2View({ request, onEdit }: { request: TravelRequest, onEdit: () => void }) {
    const isHospitalPrebooked = request.purposeData?.purpose === 'hospital' && request.purposeData?.subPurposeData?.bookingDetails?.isAppointmentPrebooked === 'yes';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Step 2: Date & Duration
                    <Button variant="ghost" size="sm" onClick={onEdit}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p><span className="font-semibold">Date:</span> {request.requestedDate ? format(new Date(request.requestedDate), 'PPP') : 'Not set'}</p>
                 {request.startTime && request.endTime && (
                    <p><span className="font-semibold">Time:</span> {request.startTime} to {request.endTime}</p>
                 )}
                 {isHospitalPrebooked && (
                     <p className="text-sm text-muted-foreground">Time is determined by your pre-booked hospital appointment.</p>
                 )}
            </CardContent>
        </Card>
    );
}

export function Step2Form({ request, onSave }: { request: TravelRequest, onSave: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const isHospitalPrebooked = request.purposeData?.purpose === 'hospital' && request.purposeData.subPurposeData?.bookingDetails?.isAppointmentPrebooked === 'yes';
  
  const form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
        requestedDate: request.requestedDate ? parseISO(request.requestedDate) : undefined,
        startTime: isHospitalPrebooked ? request.purposeData?.subPurposeData?.bookingDetails?.startTime : request.startTime || '',
        endTime: isHospitalPrebooked ? request.purposeData?.subPurposeData?.bookingDetails?.endTime : request.endTime || '',
    }
  });

  const handleStep2Save = async (data: Step2FormValues) => {
    if (!firestore) return;
    const requestDocRef = doc(firestore, 'travelRequests', request.id);

    try {
        const dataToSave: Partial<TravelRequest> = {
            requestedDate: format(data.requestedDate, 'yyyy-MM-dd'),
            startTime: data.startTime,
            endTime: data.endTime,
            step2Complete: true,
        };

        await updateDoc(requestDocRef, dataToSave);
        toast({ title: "Step 2 Complete", description: "Date and time saved." });
        onSave();
    } catch(e) {
        console.error("Error updating request:", e);
        toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    }
  };
  
  return (
    <Card>
        <CardHeader>
            <CardTitle>Step 2: Date & Duration</CardTitle>
            <CardDescription>When do you need the guide? Bookings must be at least 5 days in advance.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleStep2Save)} className="space-y-6">
                    <FormField control={form.control} name="requestedDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date of Trip</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < addDays(new Date(), 5) } initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="endTime" render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                     {isHospitalPrebooked && <p className="text-sm text-muted-foreground">Start and end times are based on your pre-booked appointment from Step 1.</p>}
                     <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Saving...' : 'Save and Continue'}
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
