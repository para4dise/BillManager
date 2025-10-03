import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { CATEGORIES, REPEAT_OPTIONS, CURRENCIES } from '../constants/categories';
import { createAccount, updateAccount, getAccountById } from '../database/accounts';
import { generatePaymentsForAccount } from '../utils/paymentGenerator';
import { getDateString, getCurrentDate } from '../utils/dateUtils';

const AccountDetail = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { accountId } = route.params || {};
  const isEditMode = !!accountId;

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

  useEffect(() => {
    // Set navigation title
    navigation.setOptions({
      title: isEditMode ? t('account.edit') : t('account.add'),
    });

    if (isEditMode) {
      loadAccount();
    }
  }, [accountId, navigation, t, isEditMode]);

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
      }
    } catch (error) {
      console.error('Error loading account:', error);
      Alert.alert(t('common.error'), t('messages.saveError'));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Please enter account name');
      return;
    }

    if (!category) {
      Alert.alert(t('common.error'), 'Please select a category');
      return;
    }

    setLoading(true);

    try {
      const accountData = {
        name: name.trim(),
        category,
        bank_account: bankAccount.trim(),
        notes: notes.trim(),
        amount: amount ? parseFloat(amount) : null,
        currency,
        repeats,
        start_date: getDateString(startDate),
        has_end_date: hasEndDate ? 1 : 0,
        end_date: hasEndDate ? getDateString(endDate) : null,
      };

      if (isEditMode) {
        // Update existing account
        await updateAccount(accountId, accountData);
        // Regenerate payments for this account
        await generatePaymentsForAccount({ id: accountId, ...accountData }, true);
        Alert.alert(t('common.success'), t('messages.updateSuccess'));
      } else {
        // Create new account
        const newAccountId = await createAccount(accountData);
        // Generate initial payments
        await generatePaymentsForAccount({ id: newAccountId, ...accountData }, false);
        Alert.alert(t('common.success'), t('messages.saveSuccess'));
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving account:', error);
      Alert.alert(t('common.error'), t('messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = () => {
    Alert.alert(
      'Select Category',
      '',
      CATEGORIES.map(cat => ({
        text: `${cat.icon} ${cat.id.toUpperCase().replace('_', ' ')}`,
        onPress: () => setCategory(cat.id),
      }))
    );
  };

  const handleRepeatSelect = () => {
    Alert.alert(
      'Repeat Frequency',
      '',
      REPEAT_OPTIONS.map(rep => ({
        text: rep.id.charAt(0).toUpperCase() + rep.id.slice(1),
        onPress: () => setRepeats(rep.value),
      }))
    );
  };

  const handleCurrencySelect = () => {
    Alert.alert(
      t('account.currency'),
      '',
      CURRENCIES.map(curr => ({
        text: `${curr.symbol} ${curr.code}`,
        onPress: () => setCurrency(curr.code),
      }))
    );
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.id === category);
  const selectedRepeat = REPEAT_OPTIONS.find(r => r.value === repeats);
  const selectedCurrency = CURRENCIES.find(c => c.code === currency);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Account Name</Text>
          <TextInput
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
          <TouchableOpacity style={styles.selectButton} onPress={handleCategorySelect}>
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
            <TouchableOpacity style={styles.currencyButton} onPress={handleCurrencySelect}>
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
          <TouchableOpacity style={styles.selectButton} onPress={handleRepeatSelect}>
            <Text style={styles.selectButtonText}>
              {selectedRepeat ? selectedRepeat.id.charAt(0).toUpperCase() + selectedRepeat.id.slice(1) : 'Monthly'}
            </Text>
          </TouchableOpacity>

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
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes..."
            placeholderTextColor={COLORS.text.secondary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Add spacing at bottom for keyboard */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
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
    minHeight: 100,
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
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccountDetail;