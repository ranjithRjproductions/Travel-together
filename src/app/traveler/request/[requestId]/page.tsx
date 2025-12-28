'use client';

import { useEffect, useState, useMemo } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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
import { addDoc, collection } from 'firebase/firestore';

export default function CreateRequestFormPage() {
  const params = useParams();
  const requestId = params.requestId as string;
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const isNewRequest = requestId === 'new';

  const userDocRef = useMemo(() => {
    if (!authUser || !firestore) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [authUser, firestore]);
  const { data: userData } = useDoc<UserData>(userDocRef);

  const requestDocRef = useMemo(() => {
    if (isNewRequest || !firestore || !requestId) return null;
    return doc(firestore, 'travelRequests', requestId);
  }, [requestId, firestore, isNewRequest]);

  const { data: request, isLoading: isRequestLoading, error: requestError } = useDoc<TravelRequest>(requestDocRef);

  const [currentTab, setCurrentTab] = useState('step-1');
  const [isEditingStep1, setIsEditingStep1] = useState(false);
  const [isEditingStep2, setIsEditingStep2] = useState(false);
  const [isEditingStep3, setIsEditingStep3] = useState(false);
  const [isEditingStep4, setIsEditingStep4] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  useEffect(() => {
    if (isAuthLoading) return;
    if (!authUser) {
      router.replace('/login');
      return;
    }
  
    if (isNewRequest && firestore && authUser.uid) {
      const createDraft = async () => {
        try {
          const newRequestRef = await addDoc(collection(firestore, 'travelRequests'), {
            travelerId: authUser.uid,
            status: 'draft',
            createdAt: new Date().toISOString(),
            step1Complete: false,
            step2Complete: false,
            step3Complete: false,
            step4Complete: false,
          });
          router.replace(`/traveler/request/${newRequestRef.id}`);
        } catch (error) {
          console.error("Failed to create draft", error);
          toast({ title: "Error", description: "Could not create a new request draft.", variant: "destructive" });
          router.replace('/traveler/dashboard');
        }
      };
      createDraft();
      return;
    }

    if (isRequestLoading) return; // Wait for request data to load

    if (!isNewRequest && request === null && !isRequestLoading) {
      // This means the document was deleted.
      toast({ title: "Draft Discarded", description: "Your travel request draft has been deleted." });
      router.push('/traveler/dashboard');
      return;
    }
    
    if (requestError) {
      // This will now properly catch permission errors on load, if any.
      toast({ title: "Error", description: "Could not load the request.", variant: "destructive" });
      router.replace('/traveler/dashboard');
      return;
    }
    
    if (!request) return; // Guard against request being null before further processing

    if (request.travelerId !== authUser.uid) {
        toast({ title: "Access Denied", description: "You do not have permission to view this request.", variant: "destructive" });
        router.replace('/traveler/dashboard');
        return;
    }

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
  }, [isAuthLoading, isRequestLoading, authUser, request, requestError, router, toast, isNewRequest, firestore, requestId]);


  const handleSave = () => {
    // The useDoc hook will trigger a re-render with the updated request data
  };

  const handleDiscardDraft = () => {
    if (!requestDocRef) return;
    // Don't await. Navigate away immediately. The useEffect cleanup will handle the rest.
    deleteDoc(requestDocRef).catch(error => {
       console.error("Failed to delete draft:", error);
        toast({
            title: "Error",
            description: "Could not discard the draft. Please try again.",
            variant: "destructive",
        });
    });
    // Optimistically close the dialog and let the useEffect handle navigation on data change.
    setIsAlertOpen(false);
  };

  const isLoading = isAuthLoading || isRequestLoading || isNewRequest || !request;

  if (isLoading) {
    return (
        <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-8 w-32" />
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

  if (!userData) {
     return (
        <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8 text-center">
            <p>Loading user details...</p>
        </main>
     );
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
                <Link href="/traveler/dashboard">Back to Dashboard</Link>
            </Button>
            {request.status === 'draft' && (
                <Button variant="destructive" size="sm" onClick={() => setIsAlertOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Discard Draft
                </Button>
            )}
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
                    <Step5Review request={request} userData={userData} />
                </TabsContent>
            </Tabs>
        </div>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to discard this draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your current travel request draft.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDiscardDraft}>Discard</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </main>
  );
}
