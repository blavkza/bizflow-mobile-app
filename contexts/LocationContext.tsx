import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface LocationContextType {
  location: Location.LocationObject | null;
  hasPermission: boolean;
  requestLocation: () => Promise<Location.LocationObject | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const requestLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      if (!hasPermission) {
        await requestPermissions();
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
      return currentLocation;
    } catch (error) {
      console.error('Location request failed:', error);
      return null;
    }
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        hasPermission,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
