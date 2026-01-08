

export type User = {
  uid: string;
  name: string;
  email: string;
  role: 'Traveler' | 'Guide';
  isAdmin?: boolean;
  photoURL?: string;
  photoAlt?: string;
  fcmTokens?: string[];
  address?: {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  };
  contact?: {
    primaryPhone: string;
    whatsappNumber?: string;
    whatsappSameAsPrimary: boolean;
  };
  disability?: {
    mainDisability: 'visually-impaired' | 'hard-of-hearing' | 'none';
    visionSubOption?: 'totally-blind' | 'low-vision';
    visionPercentage?: number;
    hearingPercentage?: number;
    requiresSignLanguageGuide?: boolean;
    documentUrl?: string;
    documentName?: string;
    agreedToVoluntaryDisclosure?: boolean;
  };
  gender?: 'Male' | 'Female';
};

export type GuideProfile = {
  id: string;
  bio: string;
  languages: string[];
  expertise: string[];
  verificationIdUrl?: string;
  onboardingState?: 'started' | 'profile-complete' | 'verification-pending' | 'active' | 'rejected';
  isAvailable?: boolean;
  address?: any;
  disabilityExpertise?: any;
};

export type TravelRequest = {
  id: string;
  travelerId: string;
  guideId?: string;
  status: 'draft' | 'pending' | 'guide-selected' | 'confirmed' | 'payment-pending' | 'completed' | 'cancelled';
  
  // Timestamps
  createdAt: any; // Initially created as a draft
  submittedAt?: any; // Submitted to find a guide
  acceptedAt?: any; // Guide confirmed
  paidAt?: any; // Payment successful
  
  tripPin?: string;
  razorpayOrderId?: string;
  
  paymentDetails?: {
    expectedAmount?: number;
    currency?: string;
    razorpayPaymentId?: string;
    processedEventId?: string;
  };

  // Email idempotency flags
  emailNotified?: {
    guideSelected?: boolean;
    travelerConfirmed?: boolean;
    travelerPaid?: boolean;
  };

  purposeData?: {
    purpose?: 'education' | 'hospital' | 'shopping';
    subPurposeData?: any; 
  };
  
  requestedDate?: string; // ISO string 'yyyy-MM-dd'
  startTime?: string; // 'HH:mm'
  endTime?: string; // 'HH:mm'

  travelMediumData?: {
    travelMedium?: 'car' | 'bus' | 'train' | 'flight';
    isTicketPrebooked?: 'yes' | 'no';
    vehicleInfo?: {
      busName?: string;
      busNumber?: string;
      trainName?: string;
      trainNumber?: string;
      flightNumber?: string;
    };
    time?: string; // 'HH:mm'
  };

  pickupData?: {
    pickupType?: 'destination' | 'hotel' | 'bus_stand' | 'railway_station' | 'airport';
    hotelDetails?: {
      name?: string;
      roomNumber?: string;
    };
    stationName?: string;
    pickupTime?: string; // 'HH:mm'
  };
  
  estimatedCost?: number;
  
  // Fields to track user data at the time of request
  travelerData?: Partial<User>;
  guideData?: Partial<User>;
  
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  step4Complete: boolean;
};
