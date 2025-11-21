import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/Card';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import { Payslip } from '@/types/payslip';
import { getPayslipsFromUser, getPayslipSummary } from '@/lib/payslip';
// import { downloadPayslipPDF } from '@/lib/pdf'; // Disabled for now

export default function PayslipsScreen() {
  const { user } = useAuth();
  // const [isGenerating, setIsGenerating] = useState<string | null>(null); // Disabled

  const payslips = useMemo(() => getPayslipsFromUser(user), [user]);
  const summary = useMemo(() => getPayslipSummary(payslips), [payslips]);

  const getStatusColor = (status: Payslip['status']) => {
    switch (status) {
      case 'Available':
        return '#10b981';
      case 'Processing':
        return '#f59e0b';
      case 'Pending':
        return '#8e8e93';
      default:
        return '#8e8e93';
    }
  };

  /* // Download logic disabled for now
  const handleDownload = async (payslip: Payslip) => {
    if (payslip.status !== 'Available') {
      Alert.alert('Not Available', 'This payslip is not yet available for download.');
      return;
    }

    try {
      setIsGenerating(payslip.id);
      await downloadPayslipPDF(user, payslip);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(null);
    }
  };
  */

  const renderPayslip = ({ item }: { item: Payslip }) => (
    // Removed onPress handler for the card since download is disabled
    <View>
      <Card style={styles.payslipCard}>
        <View style={styles.payslipHeader}>
          <View style={styles.payslipInfo}>
            <Text style={styles.payslipMonth}>
              {item.month} {item.year}
            </Text>
            {/*   <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View> */}
          </View>

          {/* Download Button Removed */}
        </View>

        <View style={styles.payslipDetails}>
          <View style={styles.payslipRow}>
            <Text style={styles.payslipLabel}>Gross Pay:</Text>
            <Text style={styles.payslipValue}>
              R{' '}
              {item.grossPay.toLocaleString('en-ZA', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.payslipRow}>
            <Text style={styles.payslipLabel}>Deductions:</Text>
            <Text style={[styles.payslipValue, { color: '#d32f2f' }]}>
              -R{' '}
              {item.deductions.toLocaleString('en-ZA', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
          {item.overtime > 0 && (
            <View style={styles.payslipRow}>
              <Text style={styles.payslipLabel}>Overtime:</Text>
              <Text style={[styles.payslipValue, { color: '#10b981' }]}>
                +R{' '}
                {item.overtime.toLocaleString('en-ZA', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          )}
          <View style={[styles.payslipRow, styles.netPayRow]}>
            <Text style={styles.netPayLabel}>Net Pay:</Text>
            <Text style={styles.netPayValue}>
              R{' '}
              {item.netPay.toLocaleString('en-ZA', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payslips</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              R{' '}
              {summary.totalEarnings.toLocaleString('en-ZA', {
                minimumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              R{' '}
              {summary.totalOvertime.toLocaleString('en-ZA', {
                minimumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.summaryLabel}>Total Overtime</Text>
          </Card>
        </View>

        {/* Payslips List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Recent Payslips</Text>
          <Text style={styles.listSubtitle}>History</Text>
        </View>

        {payslips.length > 0 ? (
          <FlatList
            data={payslips}
            renderItem={renderPayslip}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.payslipsList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No payslips found.</Text>
          </View>
        )}
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
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f3c88',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  listHeader: {
    marginBottom: 16,
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
  payslipsList: {
    paddingBottom: 20,
  },
  payslipCard: {
    marginBottom: 12,
  },
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  payslipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payslipMonth: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 12,
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
  payslipDetails: {
    gap: 8,
  },
  payslipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payslipLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  payslipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  netPayRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
    paddingTop: 12,
    marginTop: 8,
  },
  netPayLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  netPayValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
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
});
