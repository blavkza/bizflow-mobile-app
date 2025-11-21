import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { AuthContextType, User, UserRole, UserType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://necs-engineers-bizflow.vercel.app/api';

// Refresh interval in milliseconds (3 minutes)
const REFRESH_INTERVAL = 3 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { isLoaded, userId: clerkUserId, signOut, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  // Refs to track state without causing re-renders
  const refreshIntervalRef = useRef<number | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const fetchUserFromAPI = async (userId: string): Promise<User> => {
    try {
      console.log('Fetching user from API with userId:', userId);

      const token = await getToken();
      console.log('Clerk token obtained:', token ? 'Yes' : 'No');

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/users/userId/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response not OK:', response.status, errorText);

        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again');
        } else if (response.status === 403) {
          throw new Error('Access denied');
        } else if (response.status === 404) {
          throw new Error('User not found in database');
        } else {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
      }

      const userData = await response.json();
      console.log('User data fetched successfully:', userData);
      return userData;
    } catch (error) {
      console.error('Error fetching user from API:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      // Clear refresh interval on logout
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      await signOut();
      setUser(null);
      setLastError(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  // Core refresh function - only updates user data
  const refreshUser = async (silent: boolean = false): Promise<void> => {
    if (!clerkUserId || !isMountedRef.current) return;

    try {
      if (!silent) {
        setIsRefreshing(true);
        setLastError(null);
      }

      const userData = await fetchUserFromAPI(clerkUserId);

      if (isMountedRef.current) {
        setUser(userData);
        lastRefreshTimeRef.current = Date.now();
        setLastError(null);
        console.log('User data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing user:', error);

      if (isMountedRef.current) {
        // Just set the error state, don't trigger logout
        const errorMessage =
          error instanceof Error ? error.message : 'Refresh failed';
        setLastError(errorMessage);

        // Log the error but continue with existing user data
        console.warn(
          'User data refresh failed, but keeping existing data:',
          errorMessage
        );
      }
    } finally {
      if (isMountedRef.current && !silent) {
        setIsRefreshing(false);
      }
    }
  };

  // Setup automatic refresh interval
  const setupRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || !clerkUserId) return;

      console.log('Auto-refreshing user data...');
      await refreshUser(true); // Silent refresh - no loading state
    }, REFRESH_INTERVAL) as unknown as number;
  };

  // Manual refresh with loading state (for pull-to-refresh, etc.)
  const manualRefresh = async (): Promise<void> => {
    return refreshUser(false);
  };

  const login = async (username: string, password: string): Promise<void> => {
    // Authentication is handled by Clerk in the AuthScreen component
    // This function remains for interface compatibility
  };

  const logout = async () => {
    try {
      await handleLogout();
      router.replace('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  // Check authentication state when Clerk loads or userId changes
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        setIsLoading(true);
        setLastError(null);

        if (clerkUserId && isLoaded) {
          console.log('Clerk user authenticated:', clerkUserId);
          const userData = await fetchUserFromAPI(clerkUserId);

          if (isMountedRef.current) {
            setUser(userData);
            lastRefreshTimeRef.current = Date.now();
            setLastError(null);

            // Setup auto-refresh after initial load
            setupRefreshInterval();

            // Navigate based on userType
            setTimeout(() => {
              if (isMountedRef.current) {
                if (userData.userType === UserType.ADMIN) {
                  console.log('Navigating to manager dashboard');
                  router.replace('/manager');
                } else if (userData.userType === UserType.EMPLOYEE) {
                  console.log('Navigating to employee tabs');
                  router.replace('/(tabs)');
                } else {
                  console.log('Unknown user type, defaulting to tabs');
                  router.replace('/(tabs)');
                }
              }
            }, 100);
          }
        } else {
          console.log('No Clerk user authenticated, redirecting to auth');
          router.replace('/auth');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (isMountedRef.current) {
          const errorMessage =
            error instanceof Error ? error.message : 'Authentication failed';
          setLastError(errorMessage);

          // Only redirect to auth if it's an initial auth failure, not refresh
          if (!user) {
            await handleLogout();
            router.replace('/auth');
          } else {
            // If we have existing user data but refresh failed, keep the app running
            console.warn('Auth refresh failed, but keeping existing user data');
          }
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    if (isLoaded) {
      checkAuthState();
    }
  }, [isLoaded, clerkUserId]);

  // Sync user data when Clerk user changes
  useEffect(() => {
    const syncUserWithDatabase = async () => {
      if (clerkUser && clerkUserId && !user) {
        try {
          console.log('Syncing user with database');
          const userData = await fetchUserFromAPI(clerkUserId);
          if (isMountedRef.current) {
            setUser(userData);
            lastRefreshTimeRef.current = Date.now();
            setLastError(null);
          }
        } catch (error) {
          console.error('Error syncing user with database:', error);
          // Don't set error state for initial sync failures
        }
      }
    };

    syncUserWithDatabase();
  }, [clerkUser, clerkUserId, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    userRole: user?.role || null,
    userType: user?.userType || null,
    isLoading: isLoading || !isLoaded,
    isRefreshing,
    lastError,
    login,
    logout,
    refreshUser: manualRefresh,
    lastRefreshTime: lastRefreshTimeRef.current,
    clearError: () => setLastError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
