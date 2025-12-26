export type User = {
  uid: string;
  name: string;
  email: string;
  role: 'Traveler' | 'Guide';
  photoURL?: string;
};
