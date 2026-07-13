import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfileRepository } from '../infrastructure/ProfileRepository';
import { auth } from '../../../app/config/firebase';
import { Profile } from '../domain/Profile';

const PROFILE_QUERY_KEY = ['profile'];

export const useProfileQuery = () => {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      
      let profile = await ProfileRepository.getProfile(user.uid);
      if (!profile) {
        profile = { id: user.uid, phoneNumber: user.phoneNumber || 'Guest User' };
        await ProfileRepository.updateProfile(user.uid, profile);
      }
      return profile;
    },
    enabled: !!auth.currentUser,
  });
};

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      await ProfileRepository.updateProfile(user.uid, data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
};
