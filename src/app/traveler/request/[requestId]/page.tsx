'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, deleteDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { Step1Form, Step1View } from './step1-service';
import { Step2Form, Step2View } from './step2-date';
import { Step3Form, Step3View } from './step3-travel';
import { Step4Form, Step4View } from './step4-meeting';
import { Step5Review } from './step5-review';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateRequestFormPage() {
  const params = useParams();
  const requestId = params.requestId as string;
  const isNew = requestId === 'new';

  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // IMPORTANT: Only create a doc ref if the requestId is not 'new'
  const requestDocRef = useMemo(() => {
    if (!firestore || isNew || !requestId) return null;
    return doc(firestore, 'travelRequests', requestId);
  }, [requestId, firestore, isNew]);

  const { data: request, isLoading: isRequestLoading, error: requestError } = useDoc<TravelRequest>(requestDocRef);

  // Fetch the TRAVELER'S user data using the ID from the request document.
  const travelerDocRef = useMemo(() => {
    if (!firestore || !request?.travelerId) return null;
    return doc(firestore, 'users', request.travelerId);
  }, [firestore, request?.travelerId]);
  const { data: travelerData, isLoading: isTravelerDataLoading } = useDoc<UserData>(travelerDocRef);


  const [currentTab, setCurrentTab] = useState('step-1');
  const [isEditingStep1, setIsEditingStep1] = useState(true);
  const [isEditingStep2, setIsEditingStep2] = useState(false);
  const [isEditingStep3, setIsEditingStep3] = useState(false);
  const [isEditingStep4, setIsEditingStep4] = useState(false);

  // Effect to handle creation of a new request
  useEffect(() => {
    if (!isNew || !authUser || !firestore) return;

    let isMounted = true;

    const createRequest = async () => {
      // Create the draft document in Firestore
      const newRequestRef = await addDoc(collection(firestore, 'travelRequests'), {
        travelerId: authUser.uid, // Ensure the travelerId is set on creation
        status: 'draft',
        createdAt: serverTimestamp(),
        step1Complete: false,
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
      });

      if (isMounted) {
        // Redirect to the new request's URL
        router.replace(`/traveler/request/${newRequestRef.id}`);
      }
    };

    createRequest().catch(error => {
      console.error("Failed to create new request:", error);
      toast({ title: "Error", description: "Could not create a new draft. Please try again.", variant: "destructive" });
      if (isMounted) {
        router.push('/traveler/dashboard');
      }
    });

    return () => {
      isMounted = false;
    }
  }, [isNew, authUser, firestore, router, toast]);
  
  useEffect(() => {
    if (isAuthLoading || isRequestLoading || isNew) return;

    if (!authUser) {
      router.replace('/login');
      return;
    }
    
    // Check if user is an admin
    const checkAdminStatus = async () => {
      if (!firestore) return;
      const adminDocRef = doc(firestore, 'roles_admin', authUser.uid);
      const adminDoc = await getDoc(adminDocRef);
      setIsAdmin(adminDoc.exists());
    };
    checkAdminStatus();
    
    if (requestError) {
      toast({ title: "Error", description: "Could not load the request.", variant: "destructive" });
      router.replace('/traveler/dashboard');
      return;
    }

    if (hasLoadedOnce && !request) {
      router.push('/traveler/dashboard');
      return;
    }
    
    if (!request) return;
    
    setHasLoadedOnce(true);

    if (request.travelerId !== authUser.uid && !isAdmin) {
        toast({ title: "Access Denied", description: "You do not have permission to view this request.", variant: "destructive" });
        router.replace('/traveler/dashboard');
        return;
    }

    // If not a draft, we don't need to determine editing states.
    if (request.status !== 'draft') return;


    setIsEditingStep1(!request.step1Complete);
    setIsEditingStep2(!request.step2Complete && !!request.step1Complete);
    setIsEditingStep3(!request.step3Complete && !!request.step2Complete);
    setIsEditingStep4(!request.step4Complete && !!request.step3Complete);

    if (request.step4Complete) {
      setCurrentTab('step-5');
    } else if (request.step3Complete) {
      setCurrentTab('step-4');
    } else if (request.step2Complete) {
      setCurrentTab('step-3');
    } else if (request.step1Complete) {
      setCurrentTab('step-2');
    } else {
      setCurrentTab('step-1');
    }
  }, [isAuthLoading, isRequestLoading, authUser, request, requestError, router, toast, hasLoadedOnce, isNew, firestore, isAdmin]);


  const handleSave = () => {
    // The useDoc hook will trigger a re-render with the updated request data
  };

  const isLoading = isAuthLoading || isRequestLoading || isTravelerDataLoading || isNew || !hasLoadedOnce;
  
  if (isLoading) {
    return (
        <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-12 w-1/2 mb-8" />
             <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardContent>
            </Card>
        </main>
    );
  }
  
  if (!request || !travelerData) {
     return (
        <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8 text-center">
            <p>Loading details...</p>
        </main>
     );
  }

  // If the request has been submitted, show the read-only summary view
  if (request.status !== 'draft' && !isAdmin) {
    return (
      <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8">
         <h1 className="font-headline text-3xl md:text-4xl font-bold mb-8">Request Details</h1>
         <div className="max-w-2xl mx-auto">
          <Step5Review request={request} userData={travelerData} />
           <div className="flex justify-end mt-6">
              <Button onClick={() => router.push('/traveler/my-requests')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to My Requests
              </Button>
            </div>
         </div>
      </main>
    )
  }
  
    // Allow admin to view even submitted requests
  if (isAdmin && request.status !== 'draft') {
      return (
      <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8">
         <h1 className="font-headline text-3xl md:text-4xl font-bold mb-8">Request Details (Admin View)</h1>
         <div className="max-w-2xl mx-auto">
          <Step5Review request={request} userData={travelerData} />
           <div className="flex justify-end mt-6">
              <Button onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Traveler Details
              </Button>
            </div>
         </div>
      </main>
    )
  }

  // Safe boolean checks for tab triggers
  const step1Complete = Boolean(request?.step1Complete);
  const step2Complete = Boolean(request?.step2Complete);
  const step3Complete = Boolean(request?.step3Complete);
  const step4Complete = Boolean(request?.step4Complete);
  
  return (
    <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
            <Button variant="outline" asChild>
                <Link href="/traveler/my-requests">Back to My Requests</Link>
            </Button>
        </div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold mb-8">New Travel Request</h1>
        <div className="max-w-2xl mx-auto">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="step-1">Step 1</TabsTrigger>
                    <TabsTrigger value="step-2" disabled={!step1Complete}>Step 2</TabsTrigger>
                    <TabsTrigger value="step-3" disabled={!step2Complete}>Step 3</TabsTrigger>
                    <TabsTrigger value="step-4" disabled={!step3Complete}>Step 4</TabsTrigger>
                    <TabsTrigger value="step-5" disabled={!step4Complete}>Review</TabsTrigger>
                </TabsList>
                <TabsContent value="step-1" className="mt-4">
                    {isEditingStep1 ? (
                        <Step1Form request={request} onSave={handleSave} />
                    ) : (
                        <Step1View request={request} onEdit={() => setIsEditingStep1(true)} />
                    )}
                </TabsContent>
                <TabsContent value="step-2" className="mt-4">
                    {isEditingStep2 ? (
                         <Step2Form request={request} onSave={handleSave} />
                    ) : request.step2Complete ? (
                        <Step2View request={request} onEdit={() => setIsEditingStep2(true)} />
                    ) : (
                        <Step2Form request={request} onSave={handleSave} />
                    )}
                </TabsContent>
                <TabsContent value="step-3" className="mt-4">
                    {isEditingStep3 ? (
                         <Step3Form request={request} onSave={handleSave} />
                    ) : request.step3Complete ? (
                        <Step3View request={request} onEdit={() => setIsEditingStep3(true)} />
                    ) : (
                        <Step3Form request={request} onSave={handleSave} />
                    )}
                </TabsContent>
                 <TabsContent value="step-4" className="mt-4">
                    {isEditingStep4 ? (
                         <Step4Form request={request} onSave={handleSave} />
                    ) : request.step4Complete ? (
                        <Step4View request={request} onEdit={() => setIsEditingStep4(true)} />
                    ) : (
                        <Step4Form request={request} onSave={handleSave} />
                    )}
                </TabsContent>
                 <TabsContent value="step-5" className="mt-4">
                    <Step5Review request={request} userData={travelerData} />
                </TabsContent>
            </Tabs>
        </div>
    </main>
  );
}
