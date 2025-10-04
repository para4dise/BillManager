/**
 * File: src/screens/AccountDetail.js
 * Description: Account creation and editing screen with Phase 1 recurring options
 * Version: 2.0.0
 * Last Updated: 2025-10-04
 * Changes: Added Phase 1 recurring options UI
 *          - Weekly: Day of Week selection
 *          - Monthly: Day of Month selection (1-31)
 *          - Yearly: Month and Day selection
 *          Added 4 new modals for recurring option selection
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { CATEGORIES, REPEAT_OPTIONS, CURRENCIES, WEEKDAYS, MONTHS, DAYS_IN_MONTH } from '../constants/categories';
import { createAccount, updateAccount, getAccountById } from '../database/accounts';
import { generatePaymentsForAccount } from '../utils/paymentGenerator';
import { getDateString, getCurrentDate } from '../utils/dateUtils';

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

  useEffect(() => {
    // Update header button whenever form data changes
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
        
        // Load recurring detail fields
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

  const handleSave = async () => {
    // Debug logging
    console.log('Saving account with name:', name);
    console.log('Name length:', name.length);
    console.log('Trimmed name:', name.trim());
    
    // Validation
    if (!name || !name.trim()) {
      Alert.alert('Error', 'Please enter account name');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Validate amount if entered
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

      console.log('Account data to save:', accountData);

      if (isEditMode) {
        // Update existing account
        await updateAccount(accountId, accountData);
        // Regenerate payments for this account
        await generatePaymentsForAccount({ id: accountId, ...accountData }, true);
        Alert.alert('Success', 'Account updated successfully');
      } else {
        // Create new account
        const newAccountId = await createAccount(accountData);
        // Generate initial payments
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
    
    // Initialize default values based on repeat type
    const today = new Date();
    if (repeatValue === 'weekly' && dayOfWeek === null) {
      setDayOfWeek(today.getDay()); // Default to today's weekday
    } else if (repeatValue === 'monthly' && dayOfMonth === null) {
      setDayOfMonth(today.getDate()); // Default to today's date
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

  const selectedCategory = CATEGORIES.find(c => c.id === category);
  const selectedRepeat = REPEAT_OPTIONS.find(r => r.value === repeats);
  const selectedCurrency = CURRENCIES.find(c => c.code === currency);

  const handleNotesFocus = () => {
    // Scroll to show Notes section title just below header (same as PaymentDetail)
    setTimeout(() => {
      if (notesRef.current && scrollViewRef.current) {
        notesRef.current.measureLayout(
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
          {/* Account Name */}
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

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowCategoryModal(true)}>
              <Text style={styles.selectButtonText}>
                {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.id.toUpperCase().replace('_', ' ')}` : 'Select Category'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bank Account */}
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

          {/* Amount */}
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

          {/* Recurring Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recurring Payment</Text>

            {/* Repeats */}
            <Text style={styles.label}>Repeats</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowRepeatModal(true)}>
              <Text style={styles.selectButtonText}>
                {selectedRepeat ? selectedRepeat.id.charAt(0).toUpperCase() + selectedRepeat.id.slice(1) : 'Monthly'}
              </Text>
            </TouchableOpacity>

            {/* Weekly: Day of Week */}
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

            {/* Monthly: Day of Month */}
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

            {/* Yearly: Month and Day */}
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

            {/* Start Date */}
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

            {/* Has End Date */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>Has End Date</Text>
              <Switch
                value={hasEndDate}
                onValueChange={setHasEndDate}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor={hasEndDate ? COLORS.surface : COLORS.gray[100]}
              />
            </View>

            {/* End Date */}
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

          {/* Notes */}
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

          {/* Add spacing at bottom */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
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

      {/* Repeat Modal */}
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

      {/* Currency Modal */}
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

      {/* Weekday Modal */}
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

      {/* Month Modal */}
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

      {/* Day of Month Modal */}
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

      {/* Day of Year Modal */}
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