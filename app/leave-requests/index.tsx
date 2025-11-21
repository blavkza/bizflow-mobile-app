import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { format, addDays, differenceInDays } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import { LeaveRequest, LeaveBalance } from '@/types/leave';
import {
  getLeaveRequestsFromUser,
  calculateLeaveBalance,
  createLeaveRequest,
} from '@/lib/leave';
import { LeaveType, LeaveStatus } from '@/types/auth';

export default function LeaveRequestsScreen() {
  const { user, refreshUser } = useAuth();

  // Data
  const leaveRequests = useMemo(() => getLeaveRequestsFromUser(user), [user]);
  const balance = useMemo(() => calculateLeaveBalance(user), [user]);

  // State
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newRequest, setNewRequest] = useState({
    type: LeaveType.ANNUAL,
    startDate: new Date(),
    endDate: addDays(new Date(), 1),
    reason: '',
    contactInfo: '',
  });

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>(
    'start'
  );

  // Scroll Indicators State
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    setCanScrollLeft(contentOffset.x > 1);
    setCanScrollRight(
      layoutMeasurement.width + contentOffset.x < contentSize.width - 1
    );
  };

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.PENDING:
        return '#f59e0b';
      case LeaveStatus.APPROVED:
        return '#10b981';
      case LeaveStatus.REJECTED:
        return '#d32f2f';
      case LeaveStatus.CANCELLED:
        return '#6c757d';
      default:
        return '#8e8e93';
    }
  };

  const getTypeColor = (type: LeaveType) => {
    switch (type) {
      case LeaveType.ANNUAL:
        return '#1f3c88';
      case LeaveType.SICK:
        return '#d32f2f';
      case LeaveType.STUDY:
        return '#8b5cf6';
      case LeaveType.MATERNITY:
      case LeaveType.PATERNITY:
        return '#10b981';
      case LeaveType.COMPASSIONATE:
        return '#f59e0b';
      case LeaveType.UNPAID:
        return '#6c757d';
      default:
        return '#8e8e93';
    }
  };

  // Helper to get remaining days safely
  const getRemainingDays = (type: LeaveType): number | null => {
    const key = type.toLowerCase();
    // Check if the key exists in balance (e.g. compassionate might not be tracked)
    if (key in balance) {
      return (balance as any)[key].remaining;
    }
    return null; // No limit tracked
  };

  const calculateDays = (start: Date, end: Date) => {
    const diff = differenceInDays(end, start) + 1;
    return diff > 0 ? diff : 0;
  };

  const calculatedDays = calculateDays(
    newRequest.startDate,
    newRequest.endDate
  );

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      if (datePickerMode === 'start') {
        setNewRequest((prev) => {
          const newEndDate =
            selectedDate > prev.endDate
              ? addDays(selectedDate, 1)
              : prev.endDate;
          return { ...prev, startDate: selectedDate, endDate: newEndDate };
        });
      } else {
        setNewRequest((prev) => ({ ...prev, endDate: selectedDate }));
      }
    }
  };

  const openDatePicker = (mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const submitLeaveRequest = async () => {
    if (!newRequest.reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your leave request.');
      return;
    }

    if (calculatedDays <= 0) {
      Alert.alert('Error', 'End date must be on or after start date.');
      return;
    }

    // Check sufficient balance
    const remaining = getRemainingDays(newRequest.type);
    if (remaining !== null && calculatedDays > remaining) {
      Alert.alert(
        'Insufficient Leave Balance',
        `You only have ${remaining} days remaining for ${newRequest.type.toLowerCase()} leave. You requested ${calculatedDays} days.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await createLeaveRequest(user, {
        leaveType: newRequest.type,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        days: calculatedDays,
        reason: newRequest.reason,
        contactInfo: newRequest.contactInfo,
      });

      await refreshUser();

      Alert.alert('Success', 'Leave request submitted successfully!');
      setShowNewRequestModal(false);

      setNewRequest({
        type: LeaveType.ANNUAL,
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
        reason: '',
        contactInfo: '',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const balanceKeys: { key: keyof LeaveBalance; label: string }[] = [
    { key: 'annual', label: 'Annual' },
    { key: 'sick', label: 'Sick' },
    { key: 'study', label: 'Study' },
    { key: 'maternity', label: 'Maternity' },
    { key: 'paternity', label: 'Paternity' },
    { key: 'unpaid', label: 'Unpaid' },
  ];

  const renderLeaveRequest = ({ item }: { item: LeaveRequest }) => (
    <Card style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: getTypeColor(item.leaveType) },
            ]}
          >
            <Text style={styles.typeText}>
              {item.leaveType.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text style={styles.requestDates}>
            {format(item.startDate, 'MMM dd')} -{' '}
            {format(item.endDate, 'MMM dd')}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.requestReason}>{item.reason}</Text>

      <View style={styles.requestMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar" size={16} color="#6c757d" />
          <Text style={styles.metaText}>
            {item.days} day{item.days !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={16} color="#6c757d" />
          <Text style={styles.metaText}>
            Submitted {format(item.requestedDate, 'MMM dd')}
          </Text>
        </View>
      </View>

      {item.approvedBy && (
        <View style={styles.approvalInfo}>
          <Text style={styles.approvedBy}>Approved by: {item.approvedBy}</Text>
          {item.comments && (
            <Text style={styles.comments}>"{item.comments}"</Text>
          )}
        </View>
      )}
    </Card>
  );

  const allLeaveTypes = Object.values(LeaveType);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Requests</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewRequestModal(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        {/* Leave Balance */}
        <Card>
          <Text style={styles.cardTitle}>Leave Balance</Text>
          <View style={styles.scrollWrapper}>
            {canScrollLeft && (
              <View
                style={[styles.scrollIndicator, styles.scrollIndicatorLeft]}
              >
                <Ionicons name="chevron-back" size={20} color="#1f3c88" />
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.balanceScrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {balanceKeys.map((item) => (
                <View key={item.key} style={styles.balanceItem}>
                  <Text style={styles.balanceValue}>
                    {balance[item.key].remaining}
                  </Text>
                  <Text style={styles.balanceLabel}>{item.label}</Text>
                  <Text style={styles.balanceTotal}>
                    of {balance[item.key].total}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {canScrollRight && (
              <View
                style={[styles.scrollIndicator, styles.scrollIndicatorRight]}
              >
                <Ionicons name="chevron-forward" size={20} color="#1f3c88" />
              </View>
            )}
          </View>
        </Card>

        {/* Requests List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>My Requests</Text>
          <Text style={styles.listSubtitle}>
            {leaveRequests.length} total requests
          </Text>
        </View>

        {leaveRequests.length > 0 ? (
          <FlatList
            data={leaveRequests}
            renderItem={renderLeaveRequest}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.requestsList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No leave requests found.</Text>
          </View>
        )}
      </View>

      {/* New Request Modal */}
      <Modal
        visible={showNewRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              onPress={() => setShowNewRequestModal(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Leave Request</Text>
          </LinearGradient>

          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Leave Type Selection */}
            <Card>
              <Text style={styles.fieldLabel}>Leave Type</Text>
              <View style={styles.typeSelector}>
                {allLeaveTypes.map((type) => {
                  const remaining = getRemainingDays(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newRequest.type === type && styles.selectedType,
                      ]}
                      onPress={() =>
                        setNewRequest((prev) => ({ ...prev, type }))
                      }
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          newRequest.type === type && styles.selectedTypeText,
                        ]}
                      >
                        {type.replace(/_/g, ' ')}
                        {remaining !== null ? ` (${remaining})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Date Selection */}
            <Card>
              <Text style={styles.fieldLabel}>Duration</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openDatePicker('start')}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#1f3c88"
                    />
                    <Text style={styles.dateText}>
                      {format(newRequest.startDate, 'dd MMM yyyy')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateArrow}>
                  <Ionicons name="arrow-forward" size={20} color="#6c757d" />
                </View>

                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openDatePicker('end')}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#1f3c88"
                    />
                    <Text style={styles.dateText}>
                      {format(newRequest.endDate, 'dd MMM yyyy')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.daysContainer}>
                <Text style={styles.daysText}>
                  Total:{' '}
                  <Text style={styles.daysValue}>
                    {calculatedDays} Day{calculatedDays !== 1 ? 's' : ''}
                  </Text>
                </Text>
              </View>
            </Card>

            {/* Contact & Reason */}
            <Card>
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Please provide a reason..."
                value={newRequest.reason}
                onChangeText={(text) =>
                  setNewRequest((prev) => ({ ...prev, reason: text }))
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Card>

            <Card>
              <Text style={styles.fieldLabel}>Contact Info (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number or email while away..."
                value={newRequest.contactInfo}
                onChangeText={(text) =>
                  setNewRequest((prev) => ({ ...prev, contactInfo: text }))
                }
              />
            </Card>

            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={submitLeaveRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Date Picker Component */}
          {showDatePicker && (
            <DateTimePicker
              value={
                datePickerMode === 'start'
                  ? newRequest.startDate
                  : newRequest.endDate
              }
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={
                datePickerMode === 'end' ? newRequest.startDate : undefined
              }
            />
          )}

          {/* iOS Toolbar for Date Picker */}
          {Platform.OS === 'ios' && showDatePicker && (
            <View style={styles.iosDatePickerToolbar}>
              <TouchableOpacity
                style={styles.iosDoneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.iosDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  scrollWrapper: {
    position: 'relative',
    marginHorizontal: -4,
  },
  balanceScrollContent: {
    paddingRight: 20,
    paddingLeft: 4,
  },
  scrollIndicator: {
    position: 'absolute',
    top: '20%',
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  scrollIndicatorLeft: {
    left: 0,
  },
  scrollIndicatorRight: {
    right: 0,
  },
  balanceItem: {
    alignItems: 'center',
    width: 90,
    marginRight: 12,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f3c88',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  balanceTotal: {
    fontSize: 11,
    color: '#6c757d',
  },
  listHeader: {
    marginBottom: 16,
    marginTop: 24,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  listSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  requestsList: {
    paddingBottom: 20,
  },
  requestCard: {
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  requestDates: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  requestReason: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  approvalInfo: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
    paddingTop: 12,
    marginTop: 12,
  },
  approvedBy: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  comments: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBackButton: {
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e5e7',
  },
  selectedType: {
    backgroundColor: '#1f3c88',
    borderColor: '#1f3c88',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  selectedTypeText: {
    color: '#ffffff',
  },
  // Date Picker Styles
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e5e7',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  dateArrow: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  daysContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  daysText: {
    fontSize: 14,
    color: '#6c757d',
  },
  daysValue: {
    fontWeight: 'bold',
    color: '#1f3c88',
  },
  // Inputs
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e5e5e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    minHeight: 80,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#1f3c88',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  // iOS Date Picker Specifics
  iosDatePickerToolbar: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
    padding: 12,
    alignItems: 'flex-end',
  },
  iosDoneButton: {
    padding: 8,
  },
  iosDoneText: {
    color: '#1f3c88',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
