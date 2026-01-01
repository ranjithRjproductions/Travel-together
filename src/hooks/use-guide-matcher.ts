
'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { type GuideProfile } from '@/lib/definitions';

interface GuideWithProfile extends UserData {
  guideProfile?: GuideProfile;
}

export function useGuideMatcher(request: TravelRequest | null, traveler: UserData | null) {
  const firestore = useFirestore();
  const [matchedGuides, setMatchedGuides] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch all active and available guides
  const guidesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'users'),
      where('role', '==', 'Guide')
    );
  }, [firestore]);

  const { data: allGuides, isLoading: areGuidesLoading } = useCollection<GuideWithProfile>(guidesQuery);

  useEffect(() => {
    async function filterGuides() {
      if (areGuidesLoading || !allGuides || !request || !traveler) {
        if (!areGuidesLoading) setIsLoading(false);
        return;
      }
      
      setIsLoading(true);

      // Fetch all guide profiles in parallel
      const guideProfilePromises = allGuides.map(guide => {
          if (!firestore) return Promise.resolve(null);
          const profileRef = doc(firestore, `users/${guide.uid}/guideProfile/guide-profile-doc`);
          return getDoc(profileRef);
      });

      const guideProfileSnapshots = await Promise.all(guideProfilePromises);
      
      const guidesWithProfiles = allGuides.map((guide, index) => {
          const profileDoc = guideProfileSnapshots[index];
          return {
              ...guide,
              guideProfile: profileDoc?.exists() ? profileDoc.data() as GuideProfile : undefined,
          };
      });

      // --- Start Filtering ---
      let guides = guidesWithProfiles;

      // Filter 1: Availability
      guides = guides.filter(g => g.guideProfile?.onboardingState === 'active' && g.guideProfile?.isAvailable === true);

      // Filter 2: Location
      const requestDistrict = request.purposeData?.subPurposeData?.collegeAddress?.district 
                           || request.purposeData?.subPurposeData?.hospitalAddress?.district
                           || request.purposeData?.subPurposeData?.shopAddress?.district
                           || request.purposeData?.subPurposeData?.shoppingArea?.district;

      if (requestDistrict) {
        guides = guides.filter(g => g.guideProfile?.address?.district === requestDistrict);
      }
      
      // Filter 3: Gender
      if (traveler.gender) {
        guides = guides.filter(g => g.gender === traveler.gender);
      }

      // Filter 4: Expertise
      if (request.purposeData?.purpose === 'education') {
          guides = guides.filter(g => g.guideProfile?.disabilityExpertise?.localExpertise?.includes('education'));

          if (request.purposeData.subPurposeData?.subPurpose === 'scribe') {
              guides = guides.filter(g => g.guideProfile?.disabilityExpertise?.visionSupport?.willingToScribe === 'yes');
              
              const requiredSubjects = request.purposeData.subPurposeData.scribeSubjects;
              if (requiredSubjects && requiredSubjects.length > 0) {
                  guides = guides.filter(g => 
                      requiredSubjects.every((sub: string) => g.guideProfile?.disabilityExpertise?.visionSupport?.scribeSubjects?.includes(sub))
                  );
              }
          }
      } else if (request.purposeData?.purpose === 'hospital') {
          guides = guides.filter(g => g.guideProfile?.disabilityExpertise?.localExpertise?.includes('hospital'));
      } else if (request.purposeData?.purpose === 'shopping') {
           guides = guides.filter(g => g.guideProfile?.disabilityExpertise?.localExpertise?.includes('shopping'));
      }
      
      // This is a special case for hard-of-hearing travelers who require sign language.
      if (traveler.disability?.mainDisability === 'hard-of-hearing' && traveler.disability.requiresSignLanguageGuide) {
          guides = guides.filter(g => g.guideProfile?.disabilityExpertise?.hearingSupport?.knowsSignLanguage === true);
      }

      setMatchedGuides(guides);
      setIsLoading(false);
    }
    
    // Need to dynamically import getDoc and doc to avoid server-side usage errors in a client component hook
    let getDoc: any, doc: any;
    if (firestore) {
        import('firebase/firestore').then(fs => {
            getDoc = fs.getDoc;
            doc = fs.doc;
            filterGuides();
        });
    } else {
        filterGuides();
    }

  }, [allGuides, areGuidesLoading, request, traveler, firestore]);

  return { matchedGuides, isLoading };
}
