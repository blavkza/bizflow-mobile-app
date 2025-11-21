import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';

interface Employee {
  id: string;
  name: string;
  status: 'checked-in' | 'checked-out' | 'break';
  checkInTime?: string;
}

interface PendingApproval {
  id: string;
  type: 'overtime' | 'timesheet' | 'leave';
  employee: string;
  amount?: number;
  description: string;
}

const mockEmployees: Employee[] = [
  { id: '1', name: 'John Doe', status: 'checked-in', checkInTime: '9:00 AM' },
  { id: '2', name: 'Jane Smith', status: 'checked-in', checkInTime: '8:30 AM' },
  { id: '3', name: 'Mike Johnson', status: 'break', checkInTime: '9:15 AM' },
  { id: '4', name: 'Sarah Wilson', status: 'checked-out' },
];

const mockApprovals: PendingApproval[] = [
  {
    id: '1',
    type: 'overtime',
    employee: 'John Doe',
    amount: 4.5,
    description: 'Weekend deployment support',
  },
  {
    id: '2',
    type: 'timesheet',
    employee: 'Jane Smith',
    description: 'Weekly timesheet submission',
  },
];

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const [employees] = useState(mockEmployees);
  const [approvals] = useState(mockApprovals);

  const checkedInCount = employees.filter(
    (emp) => emp.status === 'checked-in'
  ).length;
  const weeklyOvertime = 23.5; // Mock data
  const pendingCount = approvals.length;

  const navigateTo = (screen: string) => {
    router.push(`/manager/${screen}` as any);
  };

  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'checked-in':
        return '#10b981';
      case 'break':
        return '#f59e0b';
      case 'checked-out':
        return '#8e8e93';
      default:
        return '#8e8e93';
    }
  };

  const getStatusIcon = (status: Employee['status']) => {
    switch (status) {
      case 'checked-in':
        return 'checkmark-circle';
      case 'break':
        return 'pause-circle';
      case 'checked-out':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <View style={styles.employeeItem}>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name}</Text>
        {item.checkInTime && (
          <Text style={styles.checkInTime}>Since {item.checkInTime}</Text>
        )}
      </View>
      <View style={styles.statusContainer}>
        <Ionicons
          name={getStatusIcon(item.status)}
          size={20}
          color={getStatusColor(item.status)}
        />
        <Text
          style={[styles.statusText, { color: getStatusColor(item.status) }]}
        >
          {item.status.replace('-', ' ')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Manager Dashboard</Text>
            <Text style={styles.userName}>Welcome, {user?.firstName}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{checkedInCount}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
            <Ionicons name="people" size={24} color="#10b981" />
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{weeklyOvertime}h</Text>
            <Text style={styles.statLabel}>Weekly OT</Text>
            <Ionicons name="time" size={24} color="#f59e0b" />
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
            <Ionicons name="hourglass" size={24} color="#d32f2f" />
          </Card>
        </View>

        {/* Quick Actions */}
        <Card>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigateTo('team')}
            >
              <Ionicons name="people" size={24} color="#1f3c88" />
              <Text style={styles.actionText}>Team View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigateTo('approvals')}
            >
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.actionText}>Approvals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigateTo('projects')}
            >
              <Ionicons name="folder" size={24} color="#f59e0b" />
              <Text style={styles.actionText}>Projects</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigateTo('map')}
            >
              <Ionicons name="map" size={24} color="#8b5cf6" />
              <Text style={styles.actionText}>GPS Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigateTo('ai-assistant')}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#d32f2f" />
              <Text style={styles.actionText}>AI Assistant</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Currently Checked In */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Team Status</Text>
            <TouchableOpacity onPress={() => navigateTo('team')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={employees.slice(0, 4)}
            renderItem={renderEmployee}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </Card>

        {/* Pending Approvals */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pending Approvals</Text>
            <TouchableOpacity onPress={() => navigateTo('approvals')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {approvals.slice(0, 3).map((approval) => (
            <View key={approval.id} style={styles.approvalItem}>
              <View style={styles.approvalIcon}>
                <Ionicons
                  name={approval.type === 'overtime' ? 'time' : 'document-text'}
                  size={20}
                  color="#1f3c88"
                />
              </View>
              <View style={styles.approvalContent}>
                <Text style={styles.approvalEmployee}>{approval.employee}</Text>
                <Text style={styles.approvalDescription}>
                  {approval.description}
                </Text>
                {approval.amount && (
                  <Text style={styles.approvalAmount}>
                    {approval.amount}h overtime
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.approveButton}>
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </Card>

        {/* KPI Overview */}
        <Card>
          <Text style={styles.cardTitle}>KPI Overview</Text>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Monthly Attendance Target</Text>
            <ProgressBar
              progress={0.92}
              color="#10b981"
              style={styles.kpiProgress}
            />
            <Text style={styles.kpiValue}>92% (Target: 95%)</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Project Completion Rate</Text>
            <ProgressBar
              progress={0.78}
              color="#1f3c88"
              style={styles.kpiProgress}
            />
            <Text style={styles.kpiValue}>78% (Target: 80%)</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Team Productivity</Text>
            <ProgressBar
              progress={0.85}
              color="#f59e0b"
              style={styles.kpiProgress}
            />
            <Text style={styles.kpiValue}>85% (Target: 85%)</Text>
          </View>
        </Card>
      </ScrollView>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    marginTop: -16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#1f3c88',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '30%',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
    textAlign: 'center',
  },
  employeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  checkInTime: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  approvalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },
  approvalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  approvalContent: {
    flex: 1,
  },
  approvalEmployee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  approvalDescription: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  approvalAmount: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 2,
  },
  approveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiItem: {
    marginBottom: 16,
  },
  kpiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  kpiProgress: {
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 12,
    color: '#6c757d',
  },
});
