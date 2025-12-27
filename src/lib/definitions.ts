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
    mainDisability?: 'vision' | 'hearing' | 'none';
    visionSubOption?: 'blind' | 'low-vision';
    visionPercentage?: number;
    hearingAssistance?: boolean;
    hearingPercentage?: number;
  }
};
