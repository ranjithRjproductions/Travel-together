export type User = {
  uid: string;
  name: string;
  email: string;
  role: 'Traveler' | 'Guide';
  photoURL?: string;
  photoAlt?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contact?: {
    primaryPhone: string;
    whatsappNumber?: string;
    whatsappSameAsPrimary: boolean;
  };
  disability?: {
    visionImpairment: boolean;
    lowVision: boolean;
    blind: boolean;
    hearingImpairment: boolean;
    mobilityImpairment: boolean;
    preferNotToSay: boolean;
    disabilityIdUrl?: string;
    agreedToVoluntaryDisclosure: boolean;
  }
};
