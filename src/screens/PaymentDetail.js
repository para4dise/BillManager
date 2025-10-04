/**
 * File: src/screens/PaymentDetail.js
 * Description: Payment detail screen with editing capabilities
 * Version: 2.5.0
 * Last Updated: 2025-10-04
 * Changes: v2.5.0 - Fixed amount reset issue when toggling paid/unpaid status
 *                    Now saves current amount before changing payment status
 *          v2.4.0 - Improved note input positioning and size
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getCurrencySymbol } from '../constants/categories';
import { formatDate } from '../utils/dateUtils';
import { getPaymentById, updatePayment, markAsPaid, markAsUnpaid } from '../database/payments';

const PaymentDetail = ({ route, navigation }) => {
  const { paymentId } = route.params;
  const [payment, setPayment] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [amount, setAmount] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [isAmountModified, setIsAmountModified] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const amountInputRef = useRef(null);
  const noteInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const amountSectionRef = useRef(null);
  const noteSectionRef = useRef(null);

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  useEffect(() => {
    // Set navigation header buttons
    navigation.setOptions({
      title: payment ? payment.account_name : 'Payment Detail',
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={{ marginRight: 10 }}>
          <Text style={{ color: COLORS.text.inverse, fontSize: 16, fontWeight: 'bold' }}>
            Save
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [payment, navigation, amount, note, isPaid]);

  const loadPayment = async () => {
    try {
      setLoading(true);
      const paymentData = await getPaymentById(paymentId);
      if (paymentData) {
        setPayment(paymentData);
        setIsPaid(paymentData.is_paid === 1);
        const formattedAmount = paymentData.amount.toFixed(2);
        setAmount(formattedAmount);
        setDefaultAmount(formattedAmount);
        
        // Check if amount has been modified from account's original amount
        // We need to get the account to compare
        const { getAccountById } = require('../database/accounts');
        const accountData = await getAccountById(paymentData.account_id);
        if (accountData && accountData.amount) {
          const accountAmount = accountData.amount.toFixed(2);
          setIsAmountModified(formattedAmount !== accountAmount);
        } else {
          setIsAmountModified(false);
        }
        
        setNote(paymentData.note || '');
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      Alert.alert('Error', 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountFocus = () => {
    // Only clear if amount has NOT been modified
    if (!isAmountModified) {
      // User wants to change default amount, clear the field
      setAmount('');
    }
    // If already modified, keep the value for editing
    
    // Scroll to amount section
    setTimeout(() => {
      if (amountSectionRef.current && scrollViewRef.current) {
        amountSectionRef.current.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }
    }, 100);
  };

  const handleAmountBlur = () => {
    // If amount is empty, restore default amount
    if (!amount || amount.trim() === '') {
      setAmount(defaultAmount);
      setIsAmountModified(false);
    }
  };

  const handleAmountChange = (text) => {
    // Allow only numbers and one decimal point
    const validText = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = validText.split('.');
    if (parts.length > 2) {
      return;
    }
    setAmount(validText);
    // Mark as modified when user types
    if (validText !== defaultAmount) {
      setIsAmountModified(true);
    }
  };

  const handleNoteFocus = () => {
    // Scroll to show "Add Note" title just below header
    setTimeout(() => {
      if (noteSectionRef.current && scrollViewRef.current) {
        noteSectionRef.current.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            // Scroll so note section title appears near top (just below header)
            scrollViewRef.current.scrollTo({ y: y - 10, animated: true });
          },
          () => {}
        );
      }
    }, 200);
  };

  const handleSave = async () => {
    // Validate amount - allow 0.00
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Error', 'Please enter a valid amount (0 or greater)');
      return;
    }

    try {
      await updatePayment(paymentId, {
        ...payment,
        amount: parsedAmount,
        is_paid: isPaid ? 1 : 0,
        paid_date: isPaid ? new Date().toISOString() : null,
        note: note.trim(),
      });
      
      Alert.alert('Success', 'Payment updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving payment:', error);
      Alert.alert('Error', 'Failed to save payment');
    }
  };

  const handleTogglePaid = async (value) => {
    setIsPaid(value);
    
    // Validate and save current amount first
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Error', 'Please enter a valid amount before changing payment status');
      setIsPaid(!value);
      return;
    }
    
    try {
      // Save current amount and note along with paid status
      await updatePayment(paymentId, {
        ...payment,
        amount: parsedAmount,
        is_paid: value ? 1 : 0,
        paid_date: value ? new Date().toISOString() : null,
        note: note.trim(),
      });
      
      // Reload to get updated data
      await loadPayment();
    } catch (error) {
      console.error('Error toggling payment status:', error);
      Alert.alert('Error', 'Failed to update payment status');
      setIsPaid(!value);
    }
  };

  const getPaymentStatus = () => {
    if (!payment) return 'unpaid';
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

  const getStatusColor = () => {
    const status = getPaymentStatus();
    switch (status) {
      case 'overdue': return COLORS.status.overdue;
      case 'dueSoon': return COLORS.status.dueSoon;
      case 'paid': return COLORS.status.paid;
      default: return COLORS.status.unpaid;
    }
  };

  const getStatusText = () => {
    const status = getPaymentStatus();
    switch (status) {
      case 'overdue': return 'OVERDUE';
      case 'dueSoon': return 'DUE SOON';
      case 'paid': return 'PAID';
      default: return 'UNPAID';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.centerContainer}>
        <Text>Payment not found</Text>
      </View>
    );
  }

  const currency = getCurrencySymbol(payment.currency || 'USD');

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.accountName}>{payment.account_name}</Text>
          <Text style={styles.category}>{payment.category}</Text>
          {payment.bank_account && (
            <Text style={styles.bankAccount}>{payment.bank_account}</Text>
          )}
        </View>

        {/* Payment Info */}
        <View 
          ref={amountSectionRef}
          style={styles.infoSection}
        >
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{formatDate(payment.due_date)}</Text>
          </View>
          
          {/* Editable Amount */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>{currency}</Text>
              <TextInput
                ref={amountInputRef}
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                onFocus={handleAmountFocus}
                onBlur={handleAmountBlur}
                keyboardType="decimal-pad"
                placeholder={defaultAmount}
                placeholderTextColor={COLORS.text.secondary}
                editable={true}
                selectTextOnFocus={false}
              />
            </View>
          </View>

          {payment.paid_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paid Date</Text>
              <Text style={styles.infoValue}>{formatDate(payment.paid_date)}</Text>
            </View>
          )}
        </View>

        {/* Mark as Paid Switch */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Mark as Paid</Text>
            <Switch
              value={isPaid}
              onValueChange={handleTogglePaid}
              trackColor={{ false: COLORS.gray[300], true: COLORS.success }}
              thumbColor={isPaid ? COLORS.surface : COLORS.gray[100]}
            />
          </View>
        </View>

        {/* Notes */}
        <View 
          ref={noteSectionRef}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Add Note</Text>
          <TextInput
            ref={noteInputRef}
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            onFocus={handleNoteFocus}
            placeholder="Add payment notes..."
            placeholderTextColor={COLORS.text.secondary}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Extra space for keyboard */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  statusText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  accountName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  category: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  bankAccount: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    minWidth: 100,
    textAlign: 'right',
    paddingVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 60,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
});

export default PaymentDetail;