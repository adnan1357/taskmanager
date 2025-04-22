import { useEffect, useState } from 'react';
import { useUser } from './use-user';

export function useVerifiedUser() {
  const { user, loading } = useUser();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verificationLoading, setVerificationLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setIsVerified(false);
        setVerificationLoading(false);
      } else {
        // Check if email is verified in user metadata
        const emailVerified = user.user_metadata?.email_verified === true;
        setIsVerified(emailVerified);
        setVerificationLoading(false);
      }
    }
  }, [user, loading]);

  return { user, isVerified, loading: loading || verificationLoading };
} 