import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import {
  getDashboardStats,
  getUpcomingDeadlines,
  getRecentActivity,
} from '@/lib/dashboard';
import { getProfileMeta } from '@/lib/profile';
import { ActivityItem } from '@/types/dashboard';

export default function EmployeeDashboard() {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // 1. Derive Data from User Context
  const stats = useMemo(() => getDashboardStats(user), [user]);
  const deadlines = useMemo(() => getUpcomingDeadlines(user), [user]);
  const activities = useMemo(() => getRecentActivity(user), [user]);

  // 2. Get Profile Metadata (Initials, Names)
  const meta = useMemo(() => getProfileMeta(user), [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  // Helper to get icon for activity type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'CHECK_IN':
        return { name: 'location' as const, color: '#1f3c88' }; // Blue
      case 'CHECK_OUT':
        return { name: 'log-out' as const, color: '#6c757d' }; // Grey
      case 'TASK_COMPLETE':
        return { name: 'checkmark-circle' as const, color: '#10b981' }; // Green
      case 'TASK_ASSIGNED':
        return { name: 'clipboard' as const, color: '#f59e0b' }; // Orange
      default:
        return { name: 'alert-circle' as const, color: '#8e8e93' };
    }
  };

  const getGreeting = (): { text: string; icon: string; color: string } => {
    const hour = new Date().getHours();

    if (hour < 12)
      return { text: 'Good morning', icon: 'partly-sunny', color: '#FFD700' }; // orange
    if (hour < 18)
      return { text: 'Good afternoon', icon: 'sunny', color: '#FFA500' }; // gold
    return { text: 'Good evening', icon: 'moon', color: '#1E90FF' }; // dodger blue
  };

  const { text, icon, color } = getGreeting();

  const avatarSource = user?.employee?.avatar || user?.avatar;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#1f3c88"
        />
      }
    >
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <View style={styles.headerContent}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              {avatarSource ? (
                <Image source={{ uri: avatarSource }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{meta.initials}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={styles.greeting}>{text}</Text>
                <Ionicons name={icon as any} size={20} color={color} />
              </View>

              <Text style={styles.userName}>
                {user?.employee?.firstName || user?.name || 'User'}
              </Text>
            </View>
          </View>

          {/* Date Section */}
          <View style={styles.dateContainer}>
            <Text style={styles.date}>{format(new Date(), 'MMM dd')}</Text>
            <Text style={styles.day}>{format(new Date(), 'EEEE')}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Actions - UPDATED */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/projects')}
          >
            <Ionicons name="briefcase" size={24} color="#1f3c88" />
            <Text style={styles.actionText}>Projects</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="trending-up" size={24} color="#1f3c88" />
            <Text style={styles.actionText}>Performance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/checkin')}
          >
            <Ionicons name="calendar-number" size={24} color="#1f3c88" />
            <Text style={styles.actionText}>Attendance</Text>
          </TouchableOpacity>
        </View>

        {/* Status Cards */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusIcon,
                  { backgroundColor: stats.checkedIn ? '#10b981' : '#ef4444' },
                ]}
              >
                <Ionicons
                  name={stats.checkedIn ? 'checkmark' : 'close'}
                  size={20}
                  color="#ffffff"
                />
              </View>
              <Text style={styles.statusLabel}>
                {stats.checkedIn ? 'Checked In' : 'Not Checked In'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="time" size={20} color="#ffffff" />
              </View>
              <Text style={styles.statusLabel}>
                {stats.overtimeHours}h Overtime
              </Text>
            </View>
          </View>
        </Card>

        {/* Today's Tasks */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Tasks</Text>
            <Text style={styles.taskCount}>
              {stats.completedTasks}/{stats.todayTasks}
            </Text>
          </View>

          {stats.todayTasks > 0 ? (
            <>
              <ProgressBar
                progress={stats.taskProgress}
                color="#10b981"
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {Math.round(stats.taskProgress * 100)}% Complete
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>No active tasks for today.</Text>
          )}
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <Text style={styles.cardTitle}>Upcoming Deadlines</Text>
          {deadlines.length > 0 ? (
            deadlines.map((deadline) => (
              <View key={deadline.id} style={styles.deadlineItem}>
                <View style={styles.deadlineIcon}>
                  <Ionicons name="calendar" size={16} color="#d32f2f" />
                </View>
                <View style={styles.deadlineContent}>
                  <Text style={styles.deadlineTitle} numberOfLines={1}>
                    {deadline.title}
                  </Text>
                  <Text style={styles.deadlineDate}>
                    {format(new Date(deadline.date), 'MMM dd, yyyy')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No upcoming deadlines.</Text>
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {activities.length > 0 ? (
            activities.map((activity) => {
              const icon = getActivityIcon(activity.type);
              return (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activitySubtitle} numberOfLines={1}>
                      {activity.subtitle}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {format(new Date(activity.timestamp), 'h:mm a')}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No recent activity found.</Text>
          )}
        </Card>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 48, // Extra padding for overlap
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Aligns avatar group and date vertically
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  userName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  day: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -32, // Pull content up to overlap header
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusCard: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  taskCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f3c88',
  },
  progressBar: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },
  deadlineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deadlineDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },
  activityIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#8e8e93',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
});
