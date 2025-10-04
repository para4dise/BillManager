/**
 * File: src/screens/PaymentDashboard.js
 * Description: Payment dashboard with month navigation and swipe-to-toggle functionality
 * Version: 2.0.5
 * Last Updated: 2025-10-04
 * Changes: v2.0.5 - Adjusted paid text alignment (reduced left padding to 20)
 *          v2.0.4 - Fixed unpaid text spacing
 *          v2.0.3 - Improved swipe action text spacing
 *          v2.0.2 - Fixed scroll-to-top issue
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '../constants/colors';
import { formatDate, getMonthName, getDayOfWeek, getDayOfMonth } from '../utils/dateUtils';
import { getPaymentsByMonth, updatePayment, markAsPaid, markAsUnpaid } from '../database/payments';
import { getCurrencySymbol } from '../constants/categories';

const PaymentDashboard = ({ navigation }) => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, paid: 0 });
  const swipeableRefs = useRef({});

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [selectedMonth])
  );

  const loadPayments = async () => {
    try {
      setLoading(true);
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      
      // Get payments for selected month
      const paymentsData = await getPaymentsByMonth(monthKey);
      
      // Calculate stats
      let totalAmount = 0;
      let paidAmount = 0;
      
      paymentsData.forEach(payment => {
        totalAmount += payment.amount;
        if (payment.is_paid) {
          paidAmount += payment.amount;
        }
      });
      
      setPayments(paymentsData);
      setMonthlyStats({ total: totalAmount, paid: paidAmount });
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    
    // Limit to current month + 2 months
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    
    if (newDate <= maxDate) {
      setSelectedMonth(newDate);
    }
  };

  const canGoNext = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth <= maxDate;
  };

  const handleSwipeLeft = async (payment) => {
    // Left swipe = Mark as Unpaid (only for paid items)
    if (!payment.is_paid) {
      swipeableRefs.current[payment.id]?.close();
      return;
    }

    try {
      await markAsUnpaid(payment.id);
      
      // Update local state instead of reloading
      setPayments(prevPayments => 
        prevPayments.map(p => 
          p.id === payment.id 
            ? { ...p, is_paid: 0, paid_date: null }
            : p
        )
      );
      
      // Update stats
      setMonthlyStats(prev => ({
        ...prev,
        paid: prev.paid - payment.amount
      }));
      
      swipeableRefs.current[payment.id]?.close();
    } catch (error) {
      console.error('Error marking as unpaid:', error);
    }
  };

  const handleSwipeRight = async (payment) => {
    // Right swipe = Mark as Paid (only for unpaid items)
    if (payment.is_paid) {
      swipeableRefs.current[payment.id]?.close();
      return;
    }

    try {
      await markAsPaid(payment.id, '');
      
      // Update local state instead of reloading
      setPayments(prevPayments => 
        prevPayments.map(p => 
          p.id === payment.id 
            ? { ...p, is_paid: 1, paid_date: new Date().toISOString() }
            : p
        )
      );
      
      // Update stats
      setMonthlyStats(prev => ({
        ...prev,
        paid: prev.paid + payment.amount
      }));
      
      swipeableRefs.current[payment.id]?.close();
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const renderLeftActions = (progress, dragX, payment) => {
    // Only show for paid items (left swipe = unpaid)
    if (!payment.is_paid) return null;

    const trans = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActionLeft}>
        <Animated.Text style={[styles.swipeActionText, { opacity: trans }]}>
          ✕ Unpaid
        </Animated.Text>
      </View>
    );
  };

  const renderRightActions = (progress, dragX, payment) => {
    // Only show for unpaid items (right swipe = paid)
    if (payment.is_paid) return null;

    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActionRight}>
        <Animated.Text style={[styles.swipeActionText, { opacity: trans }]}>
          ✓ Paid
        </Animated.Text>
      </View>
    );
  };

  const renderMonthHeader = () => {
    const currency = getCurrencySymbol('USD');
    const monthYear = `${getMonthName(selectedMonth.toISOString())} ${selectedMonth.getFullYear()}`;
    
    return (
      <View style={styles.monthHeaderContainer}>
        <View style={styles.monthNavigator}>
          <TouchableOpacity 
            onPress={goToPreviousMonth}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>←</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>{monthYear}</Text>
          
          <TouchableOpacity 
            onPress={goToNextMonth}
            style={[styles.navButton, !canGoNext() && styles.navButtonDisabled]}
            disabled={!canGoNext()}
          >
            <Text style={[styles.navButtonText, !canGoNext() && styles.navButtonTextDisabled]}>→</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.monthStats}>
          {t('payment.paid')} {currency}{monthlyStats.paid.toFixed(2)} / {t('payment.total')} {currency}{monthlyStats.total.toFixed(2)}
        </Text>
      </View>
    );
  };

  const renderPaymentItem = ({ item }) => {
    const status = getPaymentStatus(item);
    const currency = getCurrencySymbol(item.currency || 'USD');
    const isPaid = status === 'paid';
    
    return (
      <Swipeable
        ref={(ref) => swipeableRefs.current[item.id] = ref}
        renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        onSwipeableLeftOpen={() => handleSwipeLeft(item)}
        onSwipeableRightOpen={() => handleSwipeRight(item)}
        overshootLeft={false}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.paymentItem, { borderLeftColor: getStatusColor(status) }]}
          onPress={() => handlePaymentPress(item)}
        >
          <View style={styles.dateColumn}>
            <Text style={[styles.dayOfWeek, isPaid && styles.paidText]}>
              {getDayOfWeek(item.due_date)}
            </Text>
            <Text style={[styles.dayOfMonth, isPaid && styles.paidText]}>
              {getDayOfMonth(item.due_date)}
            </Text>
          </View>
          
          <View style={styles.infoColumn}>
            <Text style={[styles.category, isPaid && styles.paidText]}>
              {item.category}
            </Text>
            <Text style={[styles.accountName, isPaid && styles.paidText]}>
              {item.account_name}
            </Text>
            {item.bank_account && (
              <Text style={[styles.bankAccount, isPaid && styles.paidText]}>
                {item.bank_account}
              </Text>
            )}
          </View>
          
          <View style={styles.amountColumn}>
            <Text style={[styles.amount, isPaid && styles.amountPaid]}>
              {currency}{item.amount.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const getPaymentStatus = (payment) => {
    if (payment.is_paid) return 'paid';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'overdue';
    
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'dueSoon';
    
    return 'unpaid';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'overdue': return COLORS.status.overdue;
      case 'dueSoon': return COLORS.status.dueSoon;
      case 'paid': return COLORS.status.paid;
      default: return COLORS.status.unpaid;
    }
  };

  const handlePaymentPress = (payment) => {
    navigation.navigate('PaymentDetail', { paymentId: payment.id });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderMonthHeader()}
      {payments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t('payment.noPayments')}</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  monthHeaderContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  navButtonTextDisabled: {
    color: COLORS.gray[400],
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  monthStats: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateColumn: {
    width: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  dayOfWeek: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  dayOfMonth: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  infoColumn: {
    flex: 1,
    marginRight: 12,
  },
  category: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  bankAccount: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  amountColumn: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  amountPaid: {
    color: COLORS.text.secondary,
    opacity: 0.6,
  },
  paidText: {
    color: COLORS.text.secondary,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  swipeActionLeft: {
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    paddingRight: 30,
    marginBottom: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  swipeActionRight: {
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  swipeActionText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentDashboard;