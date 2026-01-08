
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

  // Step 1: Fetch all active guides.
  const guidesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'Guide'));
  }, [firestore]);

  const { data: allGuides, isLoading: areGuidesLoading } = useCollection<UserData>(guidesQuery);
  
  const guideProfilesMap = useMemo(() => new Map<string, GuideProfile>(), []);

  useEffect(() => {
    if (areGuidesLoading || !allGuides || !request || !traveler || !firestore) {
      if (!areGuidesLoading) {
        setIsLoading(false);
      }
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const filterAndSetGuides = async () => {
      // Step 2: Fetch guide profiles for all potential guides if not already cached
      const profilesToFetch = allGuides.filter(guide => !guideProfilesMap.has(guide.id));
      if (profilesToFetch.length > 0) {
        await Promise.all(
          profilesToFetch.map(async (guide) => {
            const profileRef = doc(firestore, `users/${guide.id}/guideProfile/guide-profile-doc`);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
              guideProfilesMap.set(guide.id, profileSnap.data() as GuideProfile);
            }
          })
        );
      }

      if (!isMounted) return;

      const guidesWithProfiles: GuideWithProfile[] = allGuides.map((guide) => {
        const profileDoc = guideProfilesMap.get(guide.id);
        return {
          ...guide,
          uid: guide.id, // Ensure UID exists for React key
          guideProfile: profileDoc,
        };
      });

      const requestDistrict = request?.purposeData?.subPurposeData?.collegeAddress?.district 
          || request?.purposeData?.subPurposeData?.hospitalAddress?.district
          || request?.purposeData?.subPurposeData?.shopAddress?.district
          || request?.purposeData?.subPurposeData?.shoppingArea?.district;

      // Step 3: Perform fine-grained filtering on the client
      const filteredGuides = guidesWithProfiles.filter((guide) => {
        const { guideProfile } = guide;

        if (!guideProfile) {
          console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Missing guideProfile.`);
          return false;
        }
        
        if (guideProfile.onboardingState !== 'active' || !guideProfile.isAvailable) {
          console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Not active or available.`);
          return false;
        }

        if (traveler.gender && guide.gender !== traveler.gender) {
          console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Mismatched gender. Guide: ${guide.gender}, Traveler: ${traveler.gender}`);
          return false;
        }

        if (!requestDistrict || guideProfile.address?.district !== requestDistrict) {
             console.log(`[Guide Matcher] Skipping guide ${guide.uid}: Mismatched district. Guide: ${guideProfile.address?.district}, Request: ${requestDistrict}`);
             return false;
        }

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

        if (request.travelerData?.disability?.mainDisability === 'hard-of-hearing' && request.travelerData?.disability.requiresSignLanguageGuide) {
          if (expertise.hearingSupport?.knowsSignLanguage !== true) {
            return false;
          }
        }

        return true;
      });

      setMatchedGuides(filteredGuides);
      setIsLoading(false);
    };

    filterAndSetGuides();

    return () => {
      isMounted = false;
    };
  }, [allGuides, areGuidesLoading, request, traveler, firestore, guideProfilesMap]);

  return { matchedGuides, isLoading };
}
