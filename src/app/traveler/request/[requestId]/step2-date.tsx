
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, parseISO, startOfToday, getYear, getMonth, getDate, getDaysInMonth } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type TravelRequest } from '@/lib/definitions';
import { step2Schema, type Step2FormValues } from '@/lib/schemas/travel-request';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useMemo } from 'react';

// DateSelect component for Day, Month, Year dropdowns
function DateSelect({
  control,
  setFormValue,
  watch,
}: {
  control: any;
  setFormValue: (field: keyof Step2FormValues, value: any) => void;
  watch: any;
}) {
  const today = startOfToday();
  const currentYear = getYear(today);
  const currentMonth = getMonth(today);
  const currentDay = getDate(today);

  const selectedYear = watch('year');
  const selectedMonth = watch('month');

  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);
  
  const months = useMemo(() => {
    const allMonths = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(currentYear, i), 'MMMM'),
    }));

    if (selectedYear === currentYear) {
      return allMonths.slice(currentMonth);
    }
    return allMonths;
  }, [selectedYear, currentYear, currentMonth]);

  const days = useMemo(() => {
    if (selectedYear === undefined || selectedMonth === undefined) {
      return [];
    }
    const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));
    const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      return allDays.slice(currentDay - 1);
    }
    return allDays;
  }, [selectedYear, selectedMonth, currentYear, currentMonth, currentDay]);

  // Reset month and day if year changes
  useEffect(() => {
    setFormValue('month', undefined);
    setFormValue('day', undefined);
  }, [selectedYear, setFormValue]);

  // Reset day if month changes
  useEffect(() => {
    setFormValue('day', undefined);
  }, [selectedMonth, setFormValue]);


  return (
    <div className="grid grid-cols-3 gap-4">
       <FormField
        control={control}
        name="year"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Year</FormLabel>
            <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString()}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="month"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Month</FormLabel>
            <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString()} disabled={!selectedYear}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={control}
        name="day"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Day</FormLabel>
            <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString()} disabled={selectedMonth === undefined}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}


export function Step2View({ request, onEdit }: { request: TravelRequest, onEdit: () => void }) {
    const isHospitalPrebooked = request.purposeData?.purpose === 'hospital' && request.purposeData?.subPurposeData?.bookingDetails?.isAppointmentPrebooked === 'yes';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Step 2: Date & Duration
                    <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit date and duration"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
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
  
  const initialDate = request.requestedDate ? parseISO(request.requestedDate) : null;
  
  const form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
        requestedDate: initialDate || undefined,
        day: initialDate ? getDate(initialDate) : undefined,
        month: initialDate ? getMonth(initialDate) : undefined,
        year: initialDate ? getYear(initialDate) : undefined,
        startTime: isHospitalPrebooked ? request.purposeData?.subPurposeData?.bookingDetails?.startTime : request.startTime || '',
        endTime: isHospitalPrebooked ? request.purposeData?.subPurposeData?.bookingDetails?.endTime : request.endTime || '',
    }
  });

  const watchDay = form.watch('day');
  const watchMonth = form.watch('month');
  const watchYear = form.watch('year');

  useEffect(() => {
    if (watchDay !== undefined && watchMonth !== undefined && watchYear !== undefined) {
      const newDate = new Date(watchYear, watchMonth, watchDay);
      if (!isNaN(newDate.getTime())) {
        form.setValue('requestedDate', newDate, { shouldValidate: true });
      }
    } else {
        form.setValue('requestedDate', undefined, { shouldValidate: true });
    }
  }, [watchDay, watchMonth, watchYear, form]);

  const handleStep2Save = async (data: Step2FormValues) => {
    if (!firestore || !data.requestedDate) {
        toast({ title: "Error", description: "Please select a valid date.", variant: "destructive" });
        return;
    };
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
            <CardDescription>When do you need the guide? Select a date from the dropdowns.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleStep2Save)} className="space-y-6">
                    <DateSelect control={form.control} setFormValue={form.setValue} watch={form.watch} />
                    <FormField name="requestedDate" control={form.control} render={({ field }) => <FormMessage />} />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} readOnly={isHospitalPrebooked} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="endTime" render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} readOnly={isHospitalPrebooked} /></FormControl><FormMessage /></FormItem>)} />
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
