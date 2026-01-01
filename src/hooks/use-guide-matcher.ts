
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDoc, doc } from 'firebase/firestore';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { type GuideProfile } from '@/lib/definitions';

interface GuideWithProfile extends UserData {
  guideProfile?: GuideProfile;
}

/**
 * A hook that takes a travel request and a traveler's profile and returns a list of matched guides.
 * This hook is optimized to perform coarse-grained filtering on Firestore and fine-grained filtering on the client.
 *
 * @param {TravelRequest | null} request - The travel request object.
 * @param {UserData | null} traveler - The user profile of the traveler making the request.
 * @returns {{ matchedGuides: UserData[], isLoading: boolean }} - An object containing the list of matched guides and a loading state.
 */
export function useGuideMatcher(request: TravelRequest | null, traveler: UserData | null) {
  const firestore = useFirestore();
  const [matchedGuides, setMatchedGuides] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all active guides. We will filter them on the client.
  const guidesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'users'),
      where('role', '==', 'Guide')
    );
  }, [firestore]);

  const { data: allGuides, isLoading: areGuidesLoading } = useCollection<UserData>(guidesQuery);

  useEffect(() => {
    if (areGuidesLoading || !allGuides || !request || !traveler || !firestore) {
      // If we are still loading initial data, don't do anything yet.
      // If we are not loading but have no guides, we can finish.
      if (!areGuidesLoading) {
        setIsLoading(false);
      }
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const filterAndSetGuides = async () => {
      // Step 1: Fetch all guide profiles for the potential guides.
      const guidesWithProfiles = await Promise.all(
        allGuides.map(async (guide) => {
          const profileRef = doc(firestore, `users/${guide.id}/guideProfile/guide-profile-doc`);
          const profileSnap = await getDoc(profileRef);
          return {
            ...guide,
            guideProfile: profileSnap.exists() ? (profileSnap.data() as GuideProfile) : undefined,
          };
        })
      );
      
      if (!isMounted) return;

      const requestDistrict = request?.purposeData?.subPurposeData?.collegeAddress?.district 
          || request?.purposeData?.subPurposeData?.hospitalAddress?.district
          || request?.purposeData?.subPurposeData?.shopAddress?.district
          || request?.purposeData?.subPurposeData?.shoppingArea?.district;

      // Step 2: Filter the guides with their full profiles.
      const filteredGuides = guidesWithProfiles.filter((guide: GuideWithProfile) => {
        const { guideProfile } = guide;

        // Profile Sanity Check
        if (!guideProfile) {
          console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Missing guideProfile.`);
          return false;
        }
        
        // Filter 1: Availability
        if (guideProfile.onboardingState !== 'active' || !guideProfile.isAvailable) {
           console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Not active or available.`);
          return false;
        }

        // Filter 2: Location
        if (!requestDistrict || guideProfile.address?.district !== requestDistrict) {
             console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Mismatched district. Guide: ${guideProfile.address?.district}, Request: ${requestDistrict}`);
             return false;
        }

        // Filter 3: Gender
        if (traveler.gender && guide.gender !== traveler.gender) {
          console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Mismatched gender.`);
          return false;
        }

        // Filter 4: Expertise
        const expertise = guideProfile.disabilityExpertise;
        if (!expertise) {
          console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Missing disabilityExpertise.`);
          return false;
        }

        const { purposeData } = request;
        const purpose = purposeData?.purpose;

        if (purpose === 'education') {
          if (!expertise.localExpertise?.includes('education')) return false;
          if (purposeData?.subPurposeData?.subPurpose === 'scribe') {
            if (expertise.visionSupport?.willingToScribe !== 'yes') return false;
            
            const requiredSubjects = purposeData.subPurposeData.scribeSubjects || [];
            const guideSubjects = expertise.visionSupport?.scribeSubjects || [];
            if (!requiredSubjects.every((sub: string) => guideSubjects.includes(sub))) {
              return false;
            }
          }
        } else if (purpose === 'hospital') {
          if (!expertise.localExpertise?.includes('hospital')) return false;
        } else if (purpose === 'shopping') {
          if (!expertise.localExpertise?.includes('shopping')) return false;
        }

        // Filter 5: Sign Language Requirement
        if (traveler.disability?.mainDisability === 'hard-of-hearing' && traveler.disability.requiresSignLanguageGuide) {
          if (expertise.hearingSupport?.knowsSignLanguage !== true) {
            return false;
          }
        }

        // If all checks pass, it's a match!
        return true;
      });

      setMatchedGuides(filteredGuides);
      setIsLoading(false);
    };

    filterAndSetGuides();

    return () => {
      isMounted = false;
    };
  }, [allGuides, areGuidesLoading, request, traveler, firestore]);

  return { matchedGuides, isLoading };
}
