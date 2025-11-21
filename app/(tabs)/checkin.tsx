import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/Card';
import { format } from 'date-fns';
import QRCode from 'react-native-qrcode-svg';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import {
  getTodayStatus,
  getWeeklyStats,
  calculateCurrentSessionHours,
  checkInUser,
  checkOutUser,
} from '@/lib/attendance';
import { CheckInMethod } from '@/types/auth';

const { width } = Dimensions.get('window');

export default function CheckInScreen() {
  const { user, refreshUser } = useAuth();
  const { requestLocation, hasPermission } = useLocation();

  // Local state
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveHours, setLiveHours] = useState(0);

  // Map State
  const [currentMapLocation, setCurrentMapLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'check-in' | 'check-out' | null
  >(null);
  const [pendingLocation, setPendingLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  // QR Code State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrValue, setQrValue] = useState('');

  // 1. Derive Status from User Context
  const status = useMemo(() => getTodayStatus(user), [user]);
  const weeklyStats = useMemo(() => getWeeklyStats(user), [user]);

  // 2. Effect: Get Current Location on Mount
  useEffect(() => {
    const getCurrentPosition = async () => {
      if (status.coordinates) {
        setCurrentMapLocation(status.coordinates);
        return;
      }
      if (hasPermission) {
        try {
          const loc = await requestLocation();
          if (loc) {
            setCurrentMapLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        } catch (err) {
          console.log('Could not fetch background location for map');
        }
      }
    };
    getCurrentPosition();
  }, [hasPermission, status.coordinates]);

  // 3. Timer for live hours
  useEffect(() => {
    let interval: any;
    if (status.checkedIn && status.checkInTime) {
      setLiveHours(calculateCurrentSessionHours(status.checkInTime));
      interval = setInterval(() => {
        setLiveHours(calculateCurrentSessionHours(status.checkInTime));
      }, 60000);
    } else {
      setLiveHours(0);
    }
    return () => clearInterval(interval);
  }, [status.checkedIn, status.checkInTime]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  // --- QR Code Generator ---
  const handleGenerateQr = async () => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Location access is needed to generate a valid QR pass.'
      );
      return;
    }

    setLoading(true);
    try {
      const location = await requestLocation();
      if (!location) throw new Error('Could not get location');

      const employeeNum = user?.employee?.employeeNumber || 'UNKNOWN';
      const timestamp = new Date().toISOString();

      // Generate data string
      const data = JSON.stringify({
        id: employeeNum,
        time: timestamp,
        address: 'Location from GPS',
        location: `${location.coords.latitude},${location.coords.longitude}`,
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });

      setQrValue(data);
      setShowQrModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate QR Code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Initiate Action -> Get Location -> Reverse Geocode -> Show Confirm Modal
  const initiateAction = async (actionType: 'check-in' | 'check-out') => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Location access is needed to check in.'
      );
      return;
    }

    setLoading(true);
    try {
      const location = await requestLocation();
      if (!location) throw new Error('Could not get location');

      let detectedAddress = 'Location from GPS';
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode.length > 0) {
          const p = geocode[0];
          const street = p.street || p.name || '';
          const city = p.city || p.subregion || '';
          const region = p.region || '';
          detectedAddress = `${street}, ${city}, ${region}`
            .replace(/^, /, '')
            .replace(/, $/, '');

          if (!detectedAddress.trim()) {
            detectedAddress = `Lat: ${location.coords.latitude.toFixed(
              4
            )}, Long: ${location.coords.longitude.toFixed(4)}`;
          }
        }
      } catch (geoError) {
        console.warn('Reverse geocoding failed', geoError);
      }

      setPendingLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: detectedAddress,
      });

      setPendingAction(actionType);
      setLoading(false);
      setShowConfirmModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to acquire location.');
      setLoading(false);
    }
  };

  // Step 2: Confirm Action -> Call API
  const handleConfirmAction = async () => {
    if (!pendingAction || !pendingLocation) return;

    setShowConfirmModal(false);
    setLoading(true);

    try {
      const employeeId = user?.employee?.employeeNumber;
      if (!employeeId) {
        throw new Error(
          'Employee information is missing. Please contact support.'
        );
      }

      const now = new Date();

      // FIX: Send lat/lng to match backend expectations
      if (pendingAction === 'check-in') {
        await checkInUser({
          employeeId: employeeId,
          date: now.toISOString(),
          timestamp: now.toISOString(),
          lat: pendingLocation.latitude, // Renamed
          lng: pendingLocation.longitude, // Renamed
          address: pendingLocation.address,
          method: CheckInMethod.GPS,
        });

        setCurrentMapLocation({
          latitude: pendingLocation.latitude,
          longitude: pendingLocation.longitude,
        });
        Alert.alert('Success', 'Checked in successfully!');
      } else {
        if (!status.recordId)
          throw new Error('No active check-in record found');

        await checkOutUser(status.recordId, {
          timestamp: now.toISOString(),
          lat: pendingLocation.latitude,
          lng: pendingLocation.longitude,
          address: pendingLocation.address,
        });
        Alert.alert('Success', 'Checked out successfully!');
      }

      await refreshUser();
    } catch (error: any) {
      console.error('Check-in/out Action Failed:', error);
      Alert.alert('Error', error.message || 'Action failed');
    } finally {
      setLoading(false);
      setPendingAction(null);
      setPendingLocation(null);
    }
  };

  const getTotalHoursToday = () => {
    if (status.checkInTime && status.checkOutTime) {
      const diffMs =
        status.checkOutTime.getTime() - status.checkInTime.getTime();
      return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
    }
    return liveHours;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <Text style={styles.headerTitle}>Check In / Out</Text>
        <Text style={styles.headerSubtitle}>
          {format(new Date(), 'EEEE, MMMM dd, yyyy')}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1f3c88"
          />
        }
      >
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: status.checkedIn ? '#10b981' : '#ef4444' },
              ]}
            >
              <Ionicons
                name={status.checkedIn ? 'checkmark' : 'close'}
                size={32}
                color="#ffffff"
              />
            </View>
            <Text style={styles.statusText}>
              {status.checkedIn ? 'Checked In' : 'Not Checked In'}
            </Text>
            {status.checkedIn && status.checkInTime && (
              <>
                <Text style={styles.timeText}>
                  Since {format(status.checkInTime, 'h:mm a')}
                </Text>
                <Text style={styles.workingHours}>Working: {liveHours}h</Text>
              </>
            )}
            {!status.checkedIn && status.checkOutTime && (
              <Text style={styles.timeText}>
                Checked out at {format(status.checkOutTime, 'h:mm a')}
              </Text>
            )}
          </View>
        </Card>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.mainActionButton,
              status.checkedIn ? styles.checkOutButton : styles.checkInButton,
              loading && styles.disabledButton,
            ]}
            onPress={() =>
              initiateAction(status.checkedIn ? 'check-out' : 'check-in')
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons
                  name={status.checkedIn ? 'log-out' : 'log-in'}
                  size={28}
                  color="#ffffff"
                />
                <View style={styles.mainActionTextContainer}>
                  <Text style={styles.actionButtonText}>
                    {status.checkedIn ? 'Check Out' : 'Check In'}
                  </Text>
                  <Text style={styles.locationHintText}>
                    My Current Location
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.qrActionButton}
            onPress={handleGenerateQr}
            disabled={loading}
          >
            <Ionicons name="qr-code" size={28} color="#1f3c88" />
            <Text style={styles.qrActionText}>My Pass</Text>
          </TouchableOpacity>
        </View>

        {/* Map Card */}
        {currentMapLocation && (
          <Card style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Ionicons name="map" size={20} color="#1f3c88" />
              <Text style={styles.locationTitle}>
                {status.checkedIn ? 'Check-In Location' : 'Current Location'}
              </Text>
            </View>

            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                region={{
                  latitude: currentMapLocation.latitude,
                  longitude: currentMapLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={currentMapLocation} title="Location" />
              </MapView>
            </View>

            {status.location && status.location !== 'Unknown Location' && (
              <Text style={styles.coordinatesText}>{status.location}</Text>
            )}
          </Card>
        )}

        {/* Today's Summary */}
        <Card>
          <Text style={styles.cardTitle}>Today's Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Check In</Text>
              <Text style={styles.summaryValue}>
                {status.checkInTime
                  ? format(status.checkInTime, 'h:mm a')
                  : '--:--'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Check Out</Text>
              <Text style={styles.summaryValue}>
                {status.checkOutTime
                  ? format(status.checkOutTime, 'h:mm a')
                  : '--:--'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{getTotalHoursToday()}h</Text>
            </View>
          </View>
        </Card>

        {/* Weekly Overview */}
        <Card>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.weeklyStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(weeklyStats.hoursWorked + liveHours).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Hours Worked</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyStats.overtime}</Text>
              <Text style={styles.statLabel}>Overtime</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {weeklyStats.daysPresent}/{weeklyStats.totalDays}
              </Text>
              <Text style={styles.statLabel}>Days Present</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <Ionicons name="list" size={24} color="#1f3c88" />
              <Text style={styles.quickActionText}>View Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/leave-requests')}
            >
              <Ionicons name="calendar" size={24} color="#1f3c88" />
              <Text style={styles.quickActionText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* LOCATION CONFIRMATION MODAL */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmTitle}>Confirm Location</Text>
            <Text style={styles.confirmSubtitle}>
              You are about to {pendingAction?.replace('-', ' ')}.
            </Text>

            {pendingLocation && (
              <>
                <View style={styles.confirmMapContainer}>
                  <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={{
                      latitude: pendingLocation.latitude,
                      longitude: pendingLocation.longitude,
                      latitudeDelta: 0.002,
                      longitudeDelta: 0.002,
                    }}
                    scrollEnabled={false}
                  >
                    <Marker
                      coordinate={pendingLocation}
                      title="Current Location"
                    />
                  </MapView>
                </View>
                <Text style={styles.addressText}>
                  <Ionicons name="location-sharp" size={14} color="#1f3c88" />{' '}
                  {pendingLocation.address}
                </Text>
              </>
            )}

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  pendingAction === 'check-out'
                    ? styles.checkOutButton
                    : styles.checkInButton,
                ]}
                onPress={handleConfirmAction}
              >
                <Text style={styles.confirmButtonText}>
                  {pendingAction === 'check-in' ? 'Check In' : 'Check Out'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQrModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Employee Pass</Text>
              <TouchableOpacity onPress={() => setShowQrModal(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={qrValue}
                size={200}
                color="black"
                backgroundColor="white"
              />
            </View>

            <Text style={styles.qrHint}>
              Show this code to the scanner to clock in/out.
            </Text>
            <Text style={styles.qrTimestamp}>
              Generated: {format(new Date(), 'h:mm:ss a')}
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  workingHours: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f3c88',
  },

  // --- ACTION ROW STYLES ---
  actionRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  mainActionButton: {
    flex: 2,
    flexDirection: 'row',
    borderRadius: 16,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  qrActionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e7',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mainActionTextContainer: {
    marginLeft: 12,
    alignItems: 'flex-start',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  locationHintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  qrActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f3c88',
    marginTop: 6,
  },
  checkInButton: {
    backgroundColor: '#10b981',
  },
  checkOutButton: {
    backgroundColor: '#d32f2f',
  },
  disabledButton: {
    backgroundColor: '#8e8e93',
  },

  // --- MAP & LOCATION ---
  locationCard: {
    marginBottom: 20,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  mapContainer: {
    height: 160,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#e5e5e7',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    marginTop: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f3c88',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e5e7',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
    textAlign: 'center',
  },

  // --- MODALS ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    alignItems: 'center',
    elevation: 10,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e5e7',
  },
  qrHint: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrTimestamp: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: '#1f3c88',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Confirm Modal Specifics
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    elevation: 10,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmMapContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: '#1f3c88',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
