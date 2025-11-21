import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, subMonths } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

interface PerformanceData {
  attendance: {
    current: number;
    target: number;
    trend: number[];
  };
  productivity: {
    tasksCompleted: number;
    averageTime: number;
    efficiency: number;
  };
  overtime: {
    thisMonth: number;
    lastMonth: number;
    yearToDate: number;
  };
  goals: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
    deadline: Date;
  }>;
}

const mockPerformanceData: PerformanceData = {
  attendance: {
    current: 95.5,
    target: 95,
    trend: [92, 94, 96, 95, 97, 95.5]
  },
  productivity: {
    tasksCompleted: 47,
    averageTime: 2.3,
    efficiency: 87
  },
  overtime: {
    thisMonth: 12.5,
    lastMonth: 8.2,
    yearToDate: 45.7
  },
  goals: [
    {
      id: '1',
      title: 'Complete 50 tasks this month',
      progress: 47,
      target: 50,
      deadline: new Date(2025, 0, 31)
    },
    {
      id: '2',
      title: 'Maintain 95% attendance',
      progress: 95.5,
      target: 95,
      deadline: new Date(2025, 0, 31)
    },
    {
      id: '3',
      title: 'Reduce average task time to 2 hours',
      progress: 2.3,
      target: 2.0,
      deadline: new Date(2025, 1, 28)
    }
  ]
};

export default function PerformanceReportsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [performanceData] = useState(mockPerformanceData);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(31, 60, 136, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(108, 117, 125, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#1f3c88',
    },
  };

  const attendanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: performanceData.attendance.trend,
        color: (opacity = 1) => `rgba(31, 60, 136, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const productivityData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [12, 15, 10, 10],
      },
    ],
  };

  const getGoalProgress = (goal: any) => {
    if (goal.title.includes('time')) {
      // For time-based goals, lower is better
      return Math.max(0, (goal.target / goal.progress) * 100);
    }
    return (goal.progress / goal.target) * 100;
  };

  const getGoalColor = (goal: any) => {
    const progress = getGoalProgress(goal);
    if (progress >= 100) return '#10b981';
    if (progress >= 75) return '#f59e0b';
    return '#d32f2f';
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1f3c88', '#2d5aa0']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance Reports</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['month', 'quarter', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.selectedPeriod
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.selectedPeriodText
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <Card>
          <Text style={styles.cardTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{performanceData.attendance.current}%</Text>
              <Text style={styles.metricLabel}>Attendance</Text>
              <View style={styles.metricTrend}>
                <Ionicons name="trending-up" size={16} color="#10b981" />
                <Text style={styles.trendText}>+2.5%</Text>
              </View>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{performanceData.productivity.tasksCompleted}</Text>
              <Text style={styles.metricLabel}>Tasks Completed</Text>
              <View style={styles.metricTrend}>
                <Ionicons name="trending-up" size={16} color="#10b981" />
                <Text style={styles.trendText}>+15%</Text>
              </View>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{performanceData.productivity.efficiency}%</Text>
              <Text style={styles.metricLabel}>Efficiency</Text>
              <View style={styles.metricTrend}>
                <Ionicons name="trending-down" size={16} color="#d32f2f" />
                <Text style={[styles.trendText, { color: '#d32f2f' }]}>-3%</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Attendance Trend */}
        <Card>
          <Text style={styles.cardTitle}>Attendance Trend</Text>
          <LineChart
            data={attendanceData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
          <View style={styles.chartSummary}>
            <Text style={styles.summaryText}>
              Current: {performanceData.attendance.current}% | Target: {performanceData.attendance.target}%
            </Text>
          </View>
        </Card>

        {/* Weekly Productivity */}
        <Card>
          <Text style={styles.cardTitle}>Weekly Task Completion</Text>
          <BarChart
            data={productivityData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisSuffix=" tasks"
          />
        </Card>

        {/* Overtime Summary */}
        <Card>
          <Text style={styles.cardTitle}>Overtime Summary</Text>
          <View style={styles.overtimeGrid}>
            <View style={styles.overtimeItem}>
              <Text style={styles.overtimeValue}>{performanceData.overtime.thisMonth}h</Text>
              <Text style={styles.overtimeLabel}>This Month</Text>
            </View>
            <View style={styles.overtimeItem}>
              <Text style={styles.overtimeValue}>{performanceData.overtime.lastMonth}h</Text>
              <Text style={styles.overtimeLabel}>Last Month</Text>
            </View>
            <View style={styles.overtimeItem}>
              <Text style={styles.overtimeValue}>{performanceData.overtime.yearToDate}h</Text>
              <Text style={styles.overtimeLabel}>Year to Date</Text>
            </View>
          </View>
          <View style={styles.overtimeComparison}>
            <Text style={styles.comparisonText}>
              {performanceData.overtime.thisMonth > performanceData.overtime.lastMonth ? '↑' : '↓'} 
              {' '}
              {Math.abs(performanceData.overtime.thisMonth - performanceData.overtime.lastMonth).toFixed(1)}h 
              vs last month
            </Text>
          </View>
        </Card>

        {/* Goals & Targets */}
        <Card>
          <Text style={styles.cardTitle}>Goals & Targets</Text>
          {performanceData.goals.map((goal) => (
            <View key={goal.id} style={styles.goalItem}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalDeadline}>
                  Due {format(goal.deadline, 'MMM dd')}
                </Text>
              </View>
              <View style={styles.goalProgress}>
                <ProgressBar
                  progress={Math.min(getGoalProgress(goal) / 100, 1)}
                  color={getGoalColor(goal)}
                  style={styles.goalProgressBar}
                />
                <Text style={styles.goalProgressText}>
                  {goal.progress} / {goal.target}
                  {goal.title.includes('time') ? 'h avg' : goal.title.includes('%') ? '%' : ''}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Performance Insights */}
        <Card>
          <Text style={styles.cardTitle}>Performance Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#e8f5e8' }]}>
                <Ionicons name="trending-up" size={20} color="#10b981" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Excellent Attendance</Text>
                <Text style={styles.insightDescription}>
                  Your attendance is above target. Keep up the great work!
                </Text>
              </View>
            </View>
            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#fff3cd' }]}>
                <Ionicons name="time" size={20} color="#f59e0b" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Task Efficiency</Text>
                <Text style={styles.insightDescription}>
                  Consider breaking down larger tasks to improve completion time.
                </Text>
              </View>
            </View>
            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="trophy" size={20} color="#1f3c88" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Goal Achievement</Text>
                <Text style={styles.insightDescription}>
                  You're on track to meet 2 out of 3 monthly goals.
                </Text>
              </View>
            </View>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedPeriod: {
    backgroundColor: '#1f3c88',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  selectedPeriodText: {
    color: '#ffffff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f3c88',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartSummary: {
    alignItems: 'center',
    marginTop: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#6c757d',
  },
  overtimeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overtimeItem: {
    alignItems: 'center',
    flex: 1,
  },
  overtimeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  overtimeLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  overtimeComparison: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
  },
  comparisonText: {
    fontSize: 14,
    color: '#6c757d',
  },
  goalItem: {
    marginBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  goalDeadline: {
    fontSize: 12,
    color: '#6c757d',
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalProgressBar: {
    flex: 1,
    marginRight: 12,
  },
  goalProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 60,
    textAlign: 'right',
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 18,
  },
});