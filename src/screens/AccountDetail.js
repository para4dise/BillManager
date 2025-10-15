/**
 * File: src/screens/AccountDetail.js
 * Description: Account creation and editing screen with Phase 1 recurring options
 * Version: 2.3.1
 * Last Updated: 2025-10-05
 * Changes: v2.3.1 - Updated Payment History display: Paid Date (with on-time/late color) + small Due Date
 *          v2.3.0 - Changed Payment History to read-only: shows Due Date, Paid Date, and Amount
 *          v2.2.1 - Fixed navigation to PaymentDetail (nested navigator)
 *          v2.2.0 - Improved Payment History: show only past payments, default 3 items with "View All" button
 *          v2.1.0 - Added collapsible Payment History section (LIFO order)
 *          v2.0.0 - Added Phase 1 recurring options UI
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
  Modal,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { CATEGORIES, REPEAT_OPTIONS, CURRENCIES, WEEKDAYS, MONTHS, DAYS_IN_MONTH } from '../constants/categories';
import { createAccount, updateAccount, getAccountById } from '../database/accounts';
import { generatePaymentsForAccount } from '../utils/paymentGenerator';
import { getDateString, getCurrentDate, formatDate } from '../utils/dateUtils';
import { getPaymentsByAccountId } from '../database/payments';

const AccountDetail = ({ route, navigation }) => {
  const { accountId } = route.params || {};
  const isEditMode = !!accountId;

  // Refs
  const scrollViewRef = useRef(null);
  const notesRef = useRef(null);
  const nameInputRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('credit_card');
  const [bankAccount, setBankAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [repeats, setRepeats] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showWeekdayModal, setShowWeekdayModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showDayOfMonthModal, setShowDayOfMonthModal] = useState(false);
  const [showDayOfYearModal, setShowDayOfYearModal] = useState(false);

  // Recurring detail fields
  const [dayOfWeek, setDayOfWeek] = useState(null);
  const [dayOfMonth, setDayOfMonth] = useState(null);
  const [monthOfYear, setMonthOfYear] = useState(null);
  const [dayOfYear, setDayOfYear] = useState(null);

  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Account' : 'Add Account',
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={{ marginRight: 10 }}>
          <Text style={{ color: COLORS.text.inverse, fontSize: 16, fontWeight: 'bold' }}>
            Save
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, name, category, bankAccount, notes, amount, currency, repeats, startDate, hasEndDate, endDate, isEditMode]);

  useEffect(() => {
    if (isEditMode) {
      loadAccount();
      loadPaymentHistory();
    }
  }, [accountId, isEditMode]);

  const loadAccount = async () => {
    try {
      const account = await getAccountById(accountId);
      if (account) {
        setName(account.name);
        setCategory(account.category);
        setBankAccount(account.bank_account || '');
        setNotes(account.notes || '');
        setAmount(account.amount ? account.amount.toString() : '');
        setCurrency(account.currency || 'USD');
        setRepeats(account.repeats || 'monthly');
        setStartDate(new Date(account.start_date));
        setHasEndDate(account.has_end_date === 1);
        if (account.end_date) {
          setEndDate(new Date(account.end_date));
        }
        
        setDayOfWeek(account.day_of_week);
        setDayOfMonth(account.day_of_month);
        setMonthOfYear(account.month_of_year);
        setDayOfYear(account.day_of_year);
      }
    } catch (error) {
      console.error('Error loading account:', error);
      Alert.alert('Error', 'Failed to load account');
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const payments = await getPaymentsByAccountId(accountId);
      
      // Filter only past payments (due_date <= today)
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      const pastPayments = payments.filter(p => {
        const dueDate = new Date(p.due_date);
        return dueDate <= today;
      });
      
      // Sort by due_date DESC (LIFO - most recent first)
      const sortedPayments = pastPayments.sort((a, b) => 
        new Date(b.due_date) - new Date(a.due_date)
      );
      
      setPaymentHistory(sortedPayments);
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  const handleSave = async () => {
    if (!name || !name.trim()) {
      Alert.alert('Error', 'Please enter account name');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (amount && amount.trim() !== '') {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
    }

    setLoading(true);

    try {
      const accountData = {
        name: name.trim(),
        category,
        bank_account: bankAccount.trim(),
        notes: notes.trim(),
        amount: amount && amount.trim() !== '' ? parseFloat(amount) : null,
        currency,
        repeats,
        start_date: getDateString(startDate),
        has_end_date: hasEndDate ? 1 : 0,
        end_date: hasEndDate ? getDateString(endDate) : null,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        month_of_year: monthOfYear,
        day_of_year: dayOfYear,
      };

      if (isEditMode) {
        await updateAccount(accountId, accountData);
        await generatePaymentsForAccount({ id: accountId, ...accountData }, true);
        await loadPaymentHistory();
        Alert.alert('Success', 'Account updated successfully');
      } else {
        const newAccountId = await createAccount(accountData);
        await generatePaymentsForAccount({ id: newAccountId, ...accountData }, false);
        Alert.alert('Success', 'Account created successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving account:', error);
      Alert.alert('Error', 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setCategory(categoryId);
    setShowCategoryModal(false);
  };

  const handleRepeatSelect = (repeatValue) => {
    setRepeats(repeatValue);
    setShowRepeatModal(false);
    
    const today = new Date();
    if (repeatValue === 'weekly' && dayOfWeek === null) {
      setDayOfWeek(today.getDay());
    } else if (repeatValue === 'monthly' && dayOfMonth === null) {
      setDayOfMonth(today.getDate());
    } else if (repeatValue === 'yearly') {
      if (monthOfYear === null) setMonthOfYear(today.getMonth() + 1);
      if (dayOfYear === null) setDayOfYear(today.getDate());
    }
  };

  const handleCurrencySelect = (currencyCode) => {
    setCurrency(currencyCode);
    setShowCurrencyModal(false);
  };

  const onStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    setShowStartDatePicker(false);
    setStartDate(currentDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || endDate;
    setShowEndDatePicker(false);
    setEndDate(currentDate);
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

  const getStatusText = (status) => {
    switch (status) {
      case 'overdue': return 'Overdue';
      case 'dueSoon': return 'Due Soon';
      case 'paid': return 'Paid';
      default: return 'Unpaid';
    }
  };

  const renderPaymentHistoryItem = ({ item }) => {
    const isPaid = item.is_paid;
    const dueDate = new Date(item.due_date);
    dueDate.setHours(23, 59, 59, 999); // End of due date
    const paidDate = item.paid_date ? new Date(item.paid_date) : null;
    
    // Check if paid on time or late
    const isOnTime = paidDate && paidDate <= dueDate;
    const statusColor = isPaid ? (isOnTime ? COLORS.success : COLORS.error) : COLORS.status.unpaid;

    return (
      <View style={styles.historyItem}>
        <View style={styles.historyItemLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <View>
            {item.paid_date ? (
              <>
                <Text style={[styles.paidDateText, { color: statusColor }]}>
                  Paid: {formatDate(item.paid_date)}
                </Text>
                <Text style={styles.dueDateSmall}>
                  Due: {formatDate(item.due_date)}
                </Text>
              </>
            ) : (
              <Text style={styles.historyDate}>
                {formatDate(item.due_date)}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.historyAmount}>
          ${item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  const selectedCategory = CATEGORIES.find(c => c.id === category);
  const selectedRepeat = REPEAT_OPTIONS.find(r => r.value === repeats);
  const selectedCurrency = CURRENCIES.find(c => c.code === currency);

  const handleNotesFocus = () => {
    setTimeout(() => {
      if (notesRef.current && scrollViewRef.current) {
        notesRef.current.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current.scrollTo({ y: y - 10, animated: true });
          },
          () => {}
        );
      }
    }, 200);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.section}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Account Name"
              placeholderTextColor={COLORS.text.secondary}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowCategoryModal(true)}>
              <Text style={styles.selectButtonText}>
                {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.id.toUpperCase().replace('_', ' ')}` : 'Select Category'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Bank Account</Text>
            <TextInput
              style={styles.input}
              value={bankAccount}
              onChangeText={setBankAccount}
              placeholder="Bank Name"
              placeholderTextColor={COLORS.text.secondary}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.text.secondary}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity style={styles.currencyButton} onPress={() => setShowCurrencyModal(true)}>
                <Text style={styles.currencyButtonText}>
                  {selectedCurrency ? `${selectedCurrency.symbol} ${selectedCurrency.code}` : 'USD'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recurring Payment</Text>

            <Text style={styles.label}>Repeats</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowRepeatModal(true)}>
              <Text style={styles.selectButtonText}>
                {selectedRepeat ? selectedRepeat.id.charAt(0).toUpperCase() + selectedRepeat.id.slice(1) : 'Monthly'}
              </Text>
            </TouchableOpacity>

            {repeats === 'weekly' && (
              <>
                <Text style={styles.label}>Day of Week</Text>
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowWeekdayModal(true)}>
                  <Text style={styles.selectButtonText}>
                    {dayOfWeek !== null ? WEEKDAYS.find(w => w.id === dayOfWeek)?.name : 'Select Day'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {repeats === 'monthly' && (
              <>
                <Text style={styles.label}>Day of Month</Text>
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowDayOfMonthModal(true)}>
                  <Text style={styles.selectButtonText}>
                    {dayOfMonth !== null ? `${dayOfMonth}` : 'Select Day'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {repeats === 'yearly' && (
              <>
                <Text style={styles.label}>Month</Text>
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowMonthModal(true)}>
                  <Text style={styles.selectButtonText}>
                    {monthOfYear !== null ? MONTHS.find(m => m.id === monthOfYear)?.name : 'Select Month'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Day</Text>
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowDayOfYearModal(true)}>
                  <Text style={styles.selectButtonText}>
                    {dayOfYear !== null ? `${dayOfYear}` : 'Select Day'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Starts On</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {startDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onStartDateChange}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.label}>Has End Date</Text>
              <Switch
                value={hasEndDate}
                onValueChange={setHasEndDate}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor={hasEndDate ? COLORS.surface : COLORS.gray[100]}
              />
            </View>

            {hasEndDate && (
              <>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {endDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                    minimumDate={startDate}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.section} ref={notesRef}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={COLORS.text.secondary}
              multiline
              numberOfLines={2}
              onFocus={handleNotesFocus}
            />
          </View>

          {isEditMode && paymentHistory.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              
              <FlatList
                data={showAllHistory ? paymentHistory : paymentHistory.slice(0, 3)}
                renderItem={renderPaymentHistoryItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                style={styles.historyList}
              />
              
              {paymentHistory.length > 3 && !showAllHistory && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => setShowAllHistory(true)}
                >
                  <Text style={styles.viewAllButtonText}>
                    View All ({paymentHistory.length})
                  </Text>
                </TouchableOpacity>
              )}
              
              {showAllHistory && paymentHistory.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => setShowAllHistory(false)}
                >
                  <Text style={styles.viewAllButtonText}>
                    Show Less
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={styles.modalScrollView}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.modalOption}
                  onPress={() => handleCategorySelect(cat.id)}
                >
                  <Text style={styles.modalOptionText}>
                    {cat.icon} {cat.id.toUpperCase().replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showRepeatModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRepeatModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRepeatModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Repeat Frequency</Text>
            <ScrollView style={styles.modalScrollView}>
              {REPEAT_OPTIONS.map((rep) => (
                <TouchableOpacity
                  key={rep.value}
                  style={styles.modalOption}
                  onPress={() => handleRepeatSelect(rep.value)}
                >
                  <Text style={styles.modalOptionText}>
                    {rep.id.charAt(0).toUpperCase() + rep.id.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <ScrollView style={styles.modalScrollView}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={styles.modalOption}
                  onPress={() => handleCurrencySelect(curr.code)}
                >
                  <Text style={styles.modalOptionText}>
                    {curr.symbol} {curr.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showWeekdayModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeekdayModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowWeekdayModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Day of Week</Text>
            <ScrollView style={styles.modalScrollView}>
              {WEEKDAYS.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setDayOfWeek(day.id);
                    setShowWeekdayModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{day.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showMonthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMonthModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <ScrollView style={styles.modalScrollView}>
              {MONTHS.map((month) => (
                <TouchableOpacity
                  key={month.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setMonthOfYear(month.id);
                    setShowMonthModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{month.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showDayOfMonthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayOfMonthModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDayOfMonthModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Day of Month</Text>
            <ScrollView style={styles.modalScrollView}>
              {DAYS_IN_MONTH.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={styles.modalOption}
                  onPress={() => {
                    setDayOfMonth(day);
                    setShowDayOfMonthModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{day}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showDayOfYearModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayOfYearModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDayOfYearModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Day</Text>
            <ScrollView style={styles.modalScrollView}>
              {DAYS_IN_MONTH.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={styles.modalOption}
                  onPress={() => {
                    setDayOfYear(day);
                    setShowDayOfYearModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{day}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    marginRight: 8,
  },
  currencyButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
  },
  currencyButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  selectButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  dateButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyList: {
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.border,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  paidDateText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  dueDateSmall: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  paidText: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
});

export default AccountDetail;