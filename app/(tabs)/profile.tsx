import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import {
  calculateProfileStatistics,
  getProfileMeta,
  formatCurrency,
  formatDate,
} from '@/lib/profile';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  // 1. Calculate Statistics
  // useMemo ensures we only recalculate when the user object changes
  const stats = useMemo(() => calculateProfileStatistics(user), [user]);

  // 2. Get Metadata (Names, Initials, Department)
  const meta = getProfileMeta(user);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{meta.initials}</Text>
          </View>
          <Text style={styles.fullName}>{meta.fullName}</Text>
          <Text style={styles.position}>
            {user?.employee?.position || 'Employee'}
          </Text>
          <Text style={styles.employeeId}>
            ID: {user?.employee?.employeeNumber || 'N/A'}
          </Text>
          <Text style={styles.role}>
            Role: {user?.role?.replace(/_/g, ' ') || 'Employee'}
          </Text>
          <Text style={styles.performanceScore}>
            Performance: {stats.performanceScore}%
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Performance Overview */}
        <Card>
          <Text style={styles.cardTitle}>Performance Overview</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{stats.attendance}%</Text>
              <Text style={styles.performanceLabel}>Attendance</Text>
              <ProgressBar
                progress={stats.attendance / 100}
                color="#10b981"
                style={styles.performanceProgress}
              />
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>
                {stats.taskCompletionRate}%
              </Text>
              <Text style={styles.performanceLabel}>Task Completion</Text>
              <ProgressBar
                progress={stats.taskCompletionRate / 100}
                color="#1f3c88"
                style={styles.performanceProgress}
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#f59e0b" />
              <Text style={styles.statText}>
                {stats.totalHoursThisMonth}h this month
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="flash" size={16} color="#8b5cf6" />
              <Text style={styles.statText}>
                {stats.overtimeHours}h overtime
              </Text>
            </View>
          </View>
        </Card>

        {/* Work Summary */}
        <Card>
          <Text style={styles.cardTitle}>Work Summary</Text>
          <View style={styles.workSummaryGrid}>
            <View style={styles.workSummaryItem}>
              <Text style={styles.workSummaryValue}>{stats.totalTasks}</Text>
              <Text style={styles.workSummaryLabel}>Total Tasks</Text>
            </View>
            <View style={styles.workSummaryItem}>
              <Text style={styles.workSummaryValue}>
                {stats.tasksCompleted}
              </Text>
              <Text style={styles.workSummaryLabel}>Completed</Text>
            </View>
            <View style={styles.workSummaryItem}>
              <Text style={styles.workSummaryValue}>
                {stats.activeProjects}
              </Text>
              <Text style={styles.workSummaryLabel}>Active Projects</Text>
            </View>
            <View style={styles.workSummaryItem}>
              <Text style={styles.workSummaryValue}>{stats.totalProjects}</Text>
              <Text style={styles.workSummaryLabel}>Total Projects</Text>
            </View>
          </View>
        </Card>

        {/* Personal Information */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            {/*  <TouchableOpacity>
              <Ionicons name="pencil" size={20} color="#1f3c88" />
            </TouchableOpacity> */}
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{meta.departmentName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Manager</Text>
              <Text style={styles.infoValue}>{meta.managerName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={styles.infoValue}>
                {user?.employee?.position || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Commencement </Text>
              <Text style={styles.infoValue}>
                {user?.employee?.hireDate
                  ? formatDate(user.employee.hireDate.toString())
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {user?.employee?.phone || user?.phone || 'N/A'}
              </Text>
            </View>
            {user?.employee?.address && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {user.employee.address}
                  {user.employee.city && `, ${user.employee.city}`}
                  {user.employee.province && `, ${user.employee.province}`}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Employment Details */}
        {user?.employee && (
          <Card>
            <Text style={styles.cardTitle}>Employment Details</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        user.employee.status === 'ACTIVE'
                          ? '#10b981'
                          : user.employee.status === 'INACTIVE'
                          ? '#6c757d'
                          : '#dc2626',
                    },
                  ]}
                >
                  {user.employee.status}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Salary Type</Text>
                <Text style={styles.infoValue}>{user.employee.salaryType}</Text>
              </View>
              {user.employee.monthlySalary && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Monthly Salary</Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(
                      Number(user.employee.monthlySalary),
                      user.employee.currency
                    )}
                  </Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Overtime Rate</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(
                    user.employee.overtimeHourRate,
                    user.employee.currency
                  )}
                  /hour
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Work Schedule</Text>
                <Text style={styles.infoValue}>
                  {user.employee.scheduledKnockIn || '09:00'} -{' '}
                  {user.employee.scheduledKnockOut || '17:00'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Working Days</Text>
                <Text style={styles.infoValue}>
                  {user.employee.workingDays?.join(', ') || 'Monday - Friday'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Leave Information */}
        {user?.employee && (
          <Card>
            <Text style={styles.cardTitle}>Leave Information</Text>
            <View style={styles.leaveGrid}>
              <View style={styles.leaveItem}>
                <Text style={styles.leaveValue}>
                  {stats.remainingLeaveDays}
                </Text>
                <Text style={styles.leaveLabel}>Remaining</Text>
                <Text style={styles.leaveType}>Annual Leave</Text>
              </View>
              <View style={styles.leaveItem}>
                <Text style={styles.leaveValue}>{stats.usedLeaveDays}</Text>
                <Text style={styles.leaveLabel}>Used</Text>
                <Text style={styles.leaveType}>This Year</Text>
              </View>
              <View style={styles.leaveItem}>
                <Text style={styles.leaveValue}>
                  {user.employee.sickLeaveDays}
                </Text>
                <Text style={styles.leaveLabel}>Available</Text>
                <Text style={styles.leaveType}>Sick Leave</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/payslips')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="document-text" size={20} color="#1f3c88" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View Payslips</Text>
                <Text style={styles.actionSubtitle}>Last 6 months</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/leave-requests')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="calendar" size={20} color="#10b981" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Leave Requests</Text>
                <Text style={styles.actionSubtitle}>
                  {stats.remainingLeaveDays} days remaining
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/tasks')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>My Tasks</Text>
                <Text style={styles.actionSubtitle}>
                  {stats.tasksCompleted}/{stats.totalTasks} completed
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="briefcase" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>My Projects</Text>
                <Text style={styles.actionSubtitle}>
                  {stats.activeProjects} active projects
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Settings */}
        <Card>
          <Text style={styles.cardTitle}>Settings</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="notifications" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Notifications</Text>
                <Text style={styles.actionSubtitle}>
                  Manage push notifications
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="help-circle" size={20} color="#6c757d" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Contact Support</Text>
                <Text style={styles.actionSubtitle}>Get help and support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
              <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="log-out" size={20} color="#d32f2f" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: '#d32f2f' }]}>
                  Logout
                </Text>
                <Text style={styles.actionSubtitle}>
                  Sign out of your account
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  profileHeader: { alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  position: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  role: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 2 },
  performanceScore: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  performanceItem: { flex: 1, marginHorizontal: 8 },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  performanceProgress: { marginTop: 8 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
  },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#6c757d', marginLeft: 4 },
  workSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  workSummaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  workSummaryValue: { fontSize: 20, fontWeight: 'bold', color: '#1f3c88' },
  workSummaryLabel: { fontSize: 12, color: '#6c757d', marginTop: 4 },
  infoGrid: { gap: 16 },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: { fontSize: 14, color: '#6c757d', flex: 1 },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 2,
    textAlign: 'right',
  },
  leaveGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  leaveItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  leaveValue: { fontSize: 18, fontWeight: 'bold', color: '#1f3c88' },
  leaveLabel: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  leaveType: { fontSize: 10, color: '#8e8e93', marginTop: 2 },
  actionsList: { gap: 0 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  actionSubtitle: { fontSize: 12, color: '#6c757d', marginTop: 2 },
});
