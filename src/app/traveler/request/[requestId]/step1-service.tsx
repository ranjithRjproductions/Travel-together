'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { tamilNaduCities, scribeSubjectOptions } from '@/lib/request-data';
import { type TravelRequest } from '@/lib/definitions';
import { step1Schema, type Step1FormValues } from '@/lib/schemas/travel-request';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit } from 'lucide-react';


export function Step1View({ request, onEdit }: { request: TravelRequest, onEdit: () => void }) {
    const { purpose, subPurposeData } = request.purposeData || {};

    let details = <p>No details provided.</p>;

    if (purpose === 'education' && subPurposeData) {
        details = (
            <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Support Type:</span> {subPurposeData.subPurpose === 'scribe' ? 'Scribe for Exam' : 'Admission Support'}</p>
                <p><span className="font-semibold">Institute:</span> {subPurposeData.collegeName}</p>
                <p><span className="font-semibold">Address:</span> {subPurposeData.collegeAddress?.street}, {subPurposeData.collegeAddress?.district}, {subPurposeData.collegeAddress?.pincode}</p>
                 {subPurposeData.subPurpose === 'scribe' && subPurposeData.scribeSubjects?.length > 0 && (
                    <p><span className="font-semibold">Subjects:</span> {subPurposeData.scribeSubjects.join(', ')}</p>
                 )}
            </div>
        );
    } else if (purpose === 'hospital' && subPurposeData) {
        details = (
            <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Hospital:</span> {subPurposeData.hospitalName}</p>
                 <p><span className="font-semibold">Address:</span> {subPurposeData.hospitalAddress?.street}, {subPurposeData.hospitalAddress?.district}, {subPurposeData.hospitalAddress?.pincode}</p>
                {subPurposeData.bookingDetails?.isAppointmentPrebooked === 'yes' ? (
                    <p><span className="font-semibold">Time:</span> Pre-booked from {subPurposeData.bookingDetails.startTime} to {subPurposeData.bookingDetails.endTime}</p>
                ) : (
                    <p><span className="font-semibold">Time:</span> {subPurposeData.bookingDetails?.visitingTime}</p>
                )}
            </div>
        );
    } else if (purpose === 'shopping' && subPurposeData) {
         details = (
            <div className="space-y-1 text-sm">
                 <p><span className="font-semibold">Shopping Type:</span> {subPurposeData.shopType === 'particular' ? 'A particular shop' : 'General shopping in an area'}</p>
                {subPurposeData.shopType === 'particular' ? (
                    <>
                        <p><span className="font-semibold">Shop Name:</span> {subPurposeData.shopName}</p>
                        <p><span className="font-semibold">Address:</span> {subPurposeData.shopAddress?.street}, {subPurposeData.shopAddress?.district}, {subPurposeData.shopAddress?.pincode}</p>
                    </>
                ) : (
                     <p><span className="font-semibold">Area:</span> {subPurposeData.shoppingArea?.area}, {subPurposeData.shoppingArea?.district}</p>
                )}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Step 1: Service & Location
                    <Button variant="ghost" size="sm" onClick={onEdit}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="font-semibold text-lg capitalize">{purpose}</p>
                {details}
            </CardContent>
        </Card>
    );
}

export function Step1Form({ request, onSave }: { request: TravelRequest, onSave: () => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: request.purposeData || {
      purpose: undefined,
      subPurposeData: {
        subPurpose: undefined,
        collegeName: '',
        collegeAddress: { street: '', district: '', pincode: '' },
        scribeSubjects: [],
        hospitalName: '',
        hospitalAddress: { street: '', district: '', pincode: '' },
        bookingDetails: { isAppointmentPrebooked: undefined, startTime: '', endTime: '', visitingTime: '' },
        shopType: undefined,
        shopName: '',
        shopAddress: { street: '', district: '', pincode: '' },
        shoppingArea: { area: '', district: '' },
        agreeNotToCarry: false,
      },
    },
    mode: 'onChange',
  });

  const watchPurpose = form.watch('purpose');
  const watchEducationSubPurpose = form.watch('subPurposeData.subPurpose');
  const watchHospitalPrebooked = form.watch('subPurposeData.bookingDetails.isAppointmentPrebooked');
  const watchShopType = form.watch('subPurposeData.shopType');

  async function onSubmit(values: Step1FormValues) {
    if (!firestore) return;
    const requestDocRef = doc(firestore, 'travelRequests', request.id);

    let cleanPurposeData: any = { purpose: values.purpose };

    switch (values.purpose) {
        case 'education':
            cleanPurposeData.subPurposeData = {
                subPurpose: values.subPurposeData.subPurpose,
                collegeName: values.subPurposeData.collegeName,
                collegeAddress: values.subPurposeData.collegeAddress,
                scribeSubjects: values.subPurposeData.subPurpose === 'scribe' ? values.subPurposeData.scribeSubjects : [],
            };
            break;
        case 'hospital':
            cleanPurposeData.subPurposeData = {
                hospitalName: values.subPurposeData.hospitalName,
                hospitalAddress: values.subPurposeData.hospitalAddress,
                bookingDetails: values.subPurposeData.bookingDetails,
            };
            break;
        case 'shopping':
             const shopType = values.subPurposeData.shopType;
            cleanPurposeData.subPurposeData = { 
                shopType,
                agreeNotToCarry: values.subPurposeData.agreeNotToCarry
            };
            if (shopType === 'particular') {
                cleanPurposeData.subPurposeData.shopName = values.subPurposeData.shopName;
                cleanPurposeData.subPurposeData.shopAddress = values.subPurposeData.shopAddress;
            } else if (shopType === 'area') {
                cleanPurposeData.subPurposeData.shoppingArea = values.subPurposeData.shoppingArea;
            }
            break;
    }

    try {
      await updateDoc(requestDocRef, { purposeData: cleanPurposeData, step1Complete: true });
      toast({ title: 'Step 1 Saved', description: 'Your service and location details have been updated.' });
      onSave();
    } catch (error: any) {
      console.error('Failed to update travel request:', error);
      toast({ title: 'Error', description: 'Could not save your changes.', variant: 'destructive' });
    }
  }

  const purposeOptions = [
      { value: 'education', label: 'Education' },
      { value: 'hospital', label: 'Hospital Visit' },
      { value: 'shopping', label: 'Shopping Assistance' }
  ];

  const educationSubPurposes = [
      { value: 'scribe', label: 'Scribe for Exam' },
      { value: 'admission', label: 'Admission Support / College Visit' },
  ];

  const renderSubPurposeFields = () => {
    switch(watchPurpose) {
        case 'education':
            return (
                <div className="space-y-4 pt-4 border-t">
                    <FormField control={form.control} name="subPurposeData.subPurpose" render={({ field }) => (<FormItem><FormLabel>Type of Educational Support</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a support type..." /></SelectTrigger></FormControl><SelectContent>{educationSubPurposes.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    {watchEducationSubPurpose === 'scribe' && (
                         <FormField control={form.control} name="subPurposeData.scribeSubjects" render={() => (<FormItem className="p-4 border rounded-md"><div className="mb-4"><FormLabel className="text-base">Scribe Subjects</FormLabel><p className="text-sm text-muted-foreground">Select the subjects you need a scribe for.</p></div>{scribeSubjectOptions.map((item) => (<FormField key={item.id} control={form.control} name="subPurposeData.scribeSubjects" render={({ field }) => { return (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox id={`scribe-${item.id}`} checked={field.value?.includes(item.id)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id)); }}/></FormControl><FormLabel htmlFor={`scribe-${item.id}`} className="font-normal">{item.label}</FormLabel></FormItem> );}}/>))}<FormMessage /></FormItem>)} />
                    )}
                    {(watchEducationSubPurpose) && (
                        <div className="space-y-4 pt-2">
                             <FormField control={form.control} name="subPurposeData.collegeName" render={({ field }) => (<FormItem><FormLabel>College/Institute Name</FormLabel><FormControl><Input placeholder="e.g., Ananda College" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="subPurposeData.collegeAddress.street" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="subPurposeData.collegeAddress.district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger></FormControl><SelectContent>{tamilNaduCities.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="subPurposeData.collegeAddress.pincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input placeholder="600001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    )}
                </div>
            );
        case 'hospital': return ( <div className="space-y-4 pt-4 border-t"><FormField control={form.control} name="subPurposeData.hospitalName" render={({ field }) => (<FormItem><FormLabel>Hospital Name</FormLabel><FormControl><Input placeholder="e.g., Apollo Hospital" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="subPurposeData.hospitalAddress.street" render={({ field }) => (<FormItem><FormLabel>Hospital Street Address</FormLabel><FormControl><Input placeholder="456 Health Ave" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="subPurposeData.hospitalAddress.district" render={({ field }) => (<FormItem><FormLabel>Hospital District</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger></FormControl><SelectContent>{tamilNaduCities.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="subPurposeData.hospitalAddress.pincode" render={({ field }) => (<FormItem><FormLabel>Hospital Pincode</FormLabel><FormControl><Input placeholder="600002" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="subPurposeData.bookingDetails.isAppointmentPrebooked" render={({ field }) => (<FormItem className="space-y-3 rounded-md border p-4"><FormLabel id="prebooked-label">Is your appointment pre-booked?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4" aria-labelledby="prebooked-label"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" id="prebooked-yes" /></FormControl><FormLabel htmlFor="prebooked-yes" className="font-normal">Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" id="prebooked-no" /></FormControl><FormLabel htmlFor="prebooked-no" className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>{watchHospitalPrebooked === 'yes' && (<div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="subPurposeData.bookingDetails.startTime" render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="subPurposeData.bookingDetails.endTime" render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>)}{watchHospitalPrebooked === 'no' && (<FormField control={form.control} name="subPurposeData.bookingDetails.visitingTime" render={({ field }) => (<FormItem><FormLabel>Preferred Visiting Time</FormLabel><FormControl><Input placeholder="e.g., Morning, around 10 AM" {...field} /></FormControl><FormMessage /></FormItem>)} />)}</div> );
        case 'shopping': return (
            <div className="space-y-4 pt-4 border-t">
                <FormField control={form.control} name="subPurposeData.shopType" render={({ field }) => (<FormItem><FormLabel>What are you shopping for?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a shopping type..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="particular">A particular shop</SelectItem><SelectItem value="area">General shopping in an area</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                {watchShopType === 'particular' && (
                    <div className="space-y-4 pt-2">
                        <h4 className="font-medium">Shop Details</h4>
                        <FormField control={form.control} name="subPurposeData.shopName" render={({ field }) => (<FormItem><FormLabel>Shop Name</FormLabel><FormControl><Input placeholder="e.g., Style Plus" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="subPurposeData.shopAddress.street" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="789 Market Rd" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="subPurposeData.shopAddress.district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger></FormControl><SelectContent>{tamilNaduCities.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="subPurposeData.shopAddress.pincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input placeholder="600017" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                )}
                {watchShopType === 'area' && (
                    <div className="space-y-4 pt-2">
                        <h4 className="font-medium">Shopping Area</h4>
                        <FormField control={form.control} name="subPurposeData.shoppingArea.area" render={({ field }) => (<FormItem><FormLabel>Area Name</FormLabel><FormControl><Input placeholder="e.g., T. Nagar" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="subPurposeData.shoppingArea.district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger></FormControl><SelectContent>{tamilNaduCities.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                )}
                 {watchShopType && (
                    <div className="pt-4 border-t">
                        <FormField control={form.control} name="subPurposeData.agreeNotToCarry" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox id="agreeNotToCarry" checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel htmlFor="agreeNotToCarry">I will not ask the guide to carry my things.</FormLabel>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
            </div>
        );
        default: return null;
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Step 1: Service & Location</CardTitle>
            <CardDescription>Tell us what you need and where. The date and time will be in the next step.</CardDescription>
        </CardHeader>
        <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="purpose" render={({ field }) => (<FormItem><FormLabel>Purpose of Trip</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a purpose..." /></SelectTrigger></FormControl><SelectContent>{purposeOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                {watchPurpose && renderSubPurposeFields()}
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting || !watchPurpose}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save and Continue'}
                    </Button>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
