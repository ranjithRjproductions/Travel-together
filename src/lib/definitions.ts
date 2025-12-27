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
    isDefault: boolean;
  };
  contact?: {
    primaryPhone: string;
    whatsappNumber?: string;
    whatsappSameAsPrimary: boolean;
  };
  disability?: {
    mainDisability: 'visually-impaired' | 'hard-of-hearing';
    visionSubOption?: 'totally-blind' | 'low-vision';
    visionPercentage?: number;
    hearingNeeds?: string;
    documentUrl?: string;
    documentName?: string;
    agreedToVoluntaryDisclosure: boolean;
  };
};
