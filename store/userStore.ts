import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  cardNumber: string;
  cardLast4: string;
  cardExpiry: string;
  cardCvv: string;
}

export const [UserProvider, useUserStore] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street',
    city: 'New York',
    zipCode: '10001',
    cardNumber: '4532 1234 5678 9012',
    cardLast4: '9012',
    cardExpiry: '12/26',
    cardCvv: '123',
  });

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const updatedProfile = { ...prev, ...updates };
      
      if (updates.cardNumber) {
        updatedProfile.cardLast4 = updates.cardNumber.slice(-4);
      }
      
      return updatedProfile;
    });
  }, []);

  return useMemo(() => ({
    profile,
    updateProfile,
  }), [profile, updateProfile]);
});