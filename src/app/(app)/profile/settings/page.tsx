'use client';

import { useDoc, useFirestore, useUser, useStorage } from '@/firebase';
import { useMemo, useState, useEffect, ChangeEvent } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  photoAlt: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
       <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);


  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', photoAlt: '' }
  });

  useEffect(() => {
    if (userProfile) {
      // If there's a profile, reset the form with its data and default to display mode.
      reset({ name: userProfile.name || '', photoAlt: userProfile.photoAlt || '' });
      setIsEditMode(!userProfile.name); // Enter edit mode only if name is missing
    } else if (!isUserLoading && !isProfileLoading) {
      // If there's no profile and we are not loading, enter edit mode.
      setIsEditMode(true);
    }
  }, [userProfile, reset, isUserLoading, isProfileLoading]);


  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    if (!userDocRef) return;
    try {
      await setDoc(userDocRef, { name: data.name, photoAlt: data.photoAlt }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your profile information has been saved.',
      });
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update your profile.',
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !storage || !user || !userDocRef) {
      toast({
        variant: "destructive",
        title: "Upload error",
        description: "Missing required upload data.",
      });
      return;
    }

    const filePath = `profile-photos/${user.uid}/${photoFile.name}`;
    const fileRef = storageRef(storage, filePath);

    setIsUploading(true);
    setUploadProgress(0);

    const uploadTask = uploadBytesResumable(fileRef, photoFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      (error) => {
        console.error("Upload error:", error);
        let description = "Unable to upload image. Please try again.";
        if (error.code === 'storage/unauthorized') {
            description = "You do not have permission to upload this file. Please check storage rules.";
        }
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: description,
        });
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          await setDoc(
            userDocRef,
            { photoURL: downloadURL },
            { merge: true }
          );

          toast({
            title: "Upload complete",
            description: "Your profile photo has been updated.",
          });

          setPhotoFile(null);
        } catch (err) {
          console.error("Saving URL failed:", err);
          toast({
            variant: "destructive",
            title: "Save failed",
            description: "Photo uploaded but could not be saved to your profile.",
          });
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    );
  };


  const isLoading = isUserLoading || isProfileLoading;
  const initials = userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || user?.email?.[0].toUpperCase();

  return (
    <div>
      <CardDescription className="mb-6">
        This is your basic identity on the platform. Your name can be updated, but your email and role are fixed for security.
      </CardDescription>

      {isLoading && <ProfileSkeleton />}

      {!isLoading && userProfile && (
        <>
          {isEditMode ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  aria-describedby="name-description"
                  aria-invalid={errors.name ? "true" : "false"}
                />
                <p id="name-description" className="text-sm text-muted-foreground">
                  Please use your name as it appears on government-issued documents.
                </p>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={userProfile.email} readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Input id="role" value={userProfile.role} readOnly />
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="photoAlt">Profile Photo Alt Text</Label>
                  <Input 
                      id="photoAlt"
                      {...register('photoAlt')}
                      placeholder="e.g., A photo of [your name] smiling."
                  />
                   <p className="text-sm text-muted-foreground">
                    Describe your profile picture for screen reader users.
                  </p>
              </div>

              <div className="flex justify-end gap-2">
                {userProfile.name && <Button variant="ghost" type="button" onClick={() => { reset({ name: userProfile.name, photoAlt: userProfile.photoAlt }); setIsEditMode(false); }}>Cancel</Button>}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
                </div>
                <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={userProfile.photoURL} alt={userProfile.photoAlt || `Profile photo of ${userProfile.name}`} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                     <div className='w-full space-y-2'>
                        <Label htmlFor="photo-upload">Update Profile Photo</Label>
                        <Input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                        {photoFile && !isUploading && <Button onClick={handlePhotoUpload} size="sm" className="mt-2">Upload</Button>}
                        {isUploading && <div className="w-full mt-2"><Progress value={uploadProgress} /><p className="text-xs text-center text-muted-foreground mt-1">{uploadProgress}%</p></div>}
                    </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Full Name</p>
                  <p>{userProfile.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Email Address</p>
                  <p>{userProfile.email}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">User Role</p>
                  <p>{userProfile.role}</p>
                </div>
                 <div>
                    <p className="font-medium text-muted-foreground">Photo Alt Text</p>
                    <p className="italic">{userProfile.photoAlt || 'Not set'}</p>
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={() => router.push('/profile/settings/address')}>Next Step</Button>
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
