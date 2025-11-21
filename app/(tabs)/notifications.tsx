import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'task' | 'message' | 'payroll' | 'announcement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task',
    title: 'New Task Assigned',
    message: 'You have been assigned a new task: "Design user interface mockups"',
    timestamp: new Date(2025, 0, 20, 10, 30),
    read: false,
    priority: 'high',
  },
  {
    id: '2',
    type: 'message',
    title: 'Manager Message',
    message: 'Team meeting scheduled for tomorrow at 2 PM in the conference room.',
    timestamp: new Date(2025, 0, 20, 9, 15),
    read: false,
    priority: 'medium',
  },
  {
    id: '3',
    type: 'payroll',
    title: 'Payslip Available',
    message: 'Your payslip for December 2024 is now available for download.',
    timestamp: new Date(2025, 0, 19, 16, 45),
    read: true,
    priority: 'low',
  },
  {
    id: '4',
    type: 'announcement',
    title: 'Company Update',
    message: 'New office hours: Monday to Friday, 9 AM to 6 PM starting next week.',
    timestamp: new Date(2025, 0, 18, 14, 20),
    read: true,
    priority: 'medium',
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task': return 'list';
      case 'message': return 'chatbubble';
      case 'payroll': return 'card';
      case 'announcement': return 'megaphone';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') return '#d32f2f';
    if (priority === 'medium') return '#f59e0b';
    
    switch (type) {
      case 'task': return '#1f3c88';
      case 'message': return '#10b981';
      case 'payroll': return '#8b5cf6';
      case 'announcement': return '#f59e0b';
      default: return '#6c757d';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity onPress={() => markAsRead(item.id)}>
      <Card style={[styles.notificationCard, !item.read && styles.unreadCard]}>
        <View style={styles.notificationHeader}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(item.type, item.priority) + '20' }
          ]}>
            <Ionicons 
              name={getNotificationIcon(item.type) as any} 
              size={20} 
              color={getNotificationColor(item.type, item.priority)} 
            />
          </View>
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationTime}>
              {format(item.timestamp, 'MMM dd, h:mm a')}
            </Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1f3c88', '#2d5aa0']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Messages & Alerts</Text>
        <Text style={styles.headerSubtitle}>
          {unreadCount} unread messages
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="checkmark-done" size={20} color="#1f3c88" />
            <Text style={styles.actionText}>Mark All Read</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="filter" size={20} color="#1f3c88" />
            <Text style={styles.actionText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationsList}
        />
      </View>
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
    alignItems: 'center',
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
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  notificationsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  notificationCard: {
    marginBottom: 8,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1f3c88',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#8e8e93',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1f3c88',
    marginLeft: 8,
    marginTop: 4,
  },
});