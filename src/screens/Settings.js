/**
 * File: src/screens/Settings.js
 * Description: Application settings screen with user preferences and developer options
 * Version: 1.4.0
 * Last Updated: 2025-10-05
 * Changes: v1.4.0 - Replaced Export/Import with Backup & Restore navigation
 *          v1.3.3 - Simplified notification settings to single line format
 *          v1.3.2 - Split time selection into hour and minute modals
 *          v1.3.1 - Expanded time options and days (1-10)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { LANGUAGES, CURRENCIES } from '../constants/categories';
import { regeneratePaymentsForAllAccounts, generatePaymentsForAllAccounts } from '../utils/paymentGenerator';
import { resetAllData, dropAllTables } from '../database/init';
import { checkAndNotify } from '../utils/notificationUtils';

const Settings = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [notificationDaysBefore, setNotificationDaysBefore] = useState('3');
  const [showHourModal, setShowHourModal] = useState(false);
  const [showMinuteModal, setShowMinuteModal] = useState(false);
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        'user_name',
        'language',
        'currency',
        'notification_enabled',
        'notification_time',
        'notification_days_before',
        'developer_mode',
      ]);

      settings.forEach(([key, value]) => {
        if (value !== null) {
          switch (key) {
            case 'user_name':
              setUserName(value);
              break;
            case 'language':
              setLanguage(value);
              break;
            case 'currency':
              setCurrency(value);
              break;
            case 'notification_enabled':
              setNotificationsEnabled(value === 'true');
              break;
            case 'notification_time':
              setNotificationTime(value);
              break;
            case 'notification_days_before':
              setNotificationDaysBefore(value);
              break;
            case 'developer_mode':
              setDeveloperMode(value === 'true');
              break;
          }
        }
      });
      
      if (!settings.find(([key]) => key === 'language')?.[1]) {
        setLanguage(i18n.language);
        await saveSetting('language', i18n.language);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    setLanguage(newLanguage);
    await saveSetting('language', newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleCurrencyChange = async (newCurrency) => {
    setCurrency(newCurrency);
    await saveSetting('currency', newCurrency);
  };

  const handleNotificationToggle = async (value) => {
    setNotificationsEnabled(value);
    await saveSetting('notification_enabled', value);
  };

  const handleDeveloperModeToggle = async (value) => {
    setDeveloperMode(value);
    await saveSetting('developer_mode', value);
  };

  const handleTestNotification = async () => {
    try {
      await checkAndNotify();
      Alert.alert('Test', 'Notification check completed. Check your notification tray.');
    } catch (error) {
      console.error('Error testing notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const handleTimeSelect = async (time) => {
    setNotificationTime(time);
    await saveSetting('notification_time', time);
    setShowHourModal(false);
    setShowMinuteModal(false);
  };

  const handleHourSelect = async (hour) => {
    const [_, minute] = notificationTime.split(':');
    const newTime = `${hour}:${minute}`;
    await handleTimeSelect(newTime);
  };

  const handleMinuteSelect = async (minute) => {
    const [hour, _] = notificationTime.split(':');
    const newTime = `${hour}:${minute}`;
    await handleTimeSelect(newTime);
  };

  const handleDaysSelect = async (days) => {
    setNotificationDaysBefore(days);
    await saveSetting('notification_days_before', days);
    setShowDaysModal(false);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const daysOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleRegeneratePaymentsSkip = async () => {
    Alert.alert(
      t('settings.regenerateSkip'),
      'This will generate missing payment records for all accounts.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              const result = await generatePaymentsForAllAccounts(true);
              Alert.alert(
                t('common.success'),
                `Created ${result.created} payments, skipped ${result.skipped} existing records.`
              );
            } catch (error) {
              console.error('Error regenerating payments:', error);
              Alert.alert(t('common.error'), t('messages.saveError'));
            }
          },
        },
      ]
    );
  };

  const handleRegeneratePaymentsDelete = async () => {
    Alert.alert(
      t('settings.regenerateDelete'),
      'This will DELETE all existing payment records and recreate them. This action cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await regeneratePaymentsForAllAccounts();
              Alert.alert(
                t('common.success'),
                `Regenerated ${result.created} payments for ${result.accountsProcessed} accounts.`
              );
            } catch (error) {
              console.error('Error regenerating payments:', error);
              Alert.alert(t('common.error'), t('messages.saveError'));
            }
          },
        },
      ]
    );
  };

  const handleDataReset = () => {
    Alert.alert(
      t('settings.resetAll'),
      t('messages.resetWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              t('settings.resetAll'),
              t('messages.resetConfirm'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async (text) => {
                    if (text === 'DELETE ALL DATA') {
                      try {
                        await resetAllData();
                        Alert.alert(t('common.success'), t('messages.resetSuccess'));
                      } catch (error) {
                        console.error('Error resetting data:', error);
                        Alert.alert(t('common.error'), t('messages.deleteError'));
                      }
                    } else {
                      Alert.alert(t('common.error'), 'Incorrect confirmation text');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSettingItem = (label, value, onPress) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </TouchableOpacity>
  );

  const renderToggleItem = (label, value, onToggle) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
        thumbColor={value ? COLORS.surface : COLORS.gray[100]}
      />
    </View>
  );

  const renderButton = (label, onPress, destructive = false) => (
    <TouchableOpacity
      style={[styles.button, destructive && styles.buttonDestructive]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, destructive && styles.buttonTextDestructive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderSection(t('settings.profile'), (
        <>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t('settings.name')}</Text>
            <TextInput
              style={styles.input}
              value={userName}
              onChangeText={setUserName}
              onBlur={() => saveSetting('user_name', userName)}
              placeholder={t('settings.name')}
              placeholderTextColor={COLORS.text.secondary}
            />
          </View>
          {renderSettingItem(
            t('settings.language'),
            LANGUAGES.find(l => l.code === language)?.nativeName || 'English',
            () => {
              Alert.alert(
                t('settings.language'),
                'Select Language',
                LANGUAGES.map(lang => ({
                  text: lang.nativeName,
                  onPress: () => handleLanguageChange(lang.code),
                }))
              );
            }
          )}
          {renderSettingItem(
            t('settings.currency'),
            CURRENCIES.find(c => c.code === currency)?.code || 'USD',
            () => {
              Alert.alert(
                t('settings.currency'),
                'Select Currency',
                CURRENCIES.map(curr => ({
                  text: `${curr.code} (${curr.symbol})`,
                  onPress: () => handleCurrencyChange(curr.code),
                }))
              );
            }
          )}
        </>
      ))}

      {renderSection(t('settings.notifications'), (
        <>
          {renderToggleItem(
            t('settings.enableNotifications'),
            notificationsEnabled,
            handleNotificationToggle
          )}
          <View style={styles.singleLineRow}>
            <TouchableOpacity 
              style={styles.selectInputTiny}
              onPress={() => setShowHourModal(true)}
            >
              <Text style={styles.selectInputText}>{notificationTime.split(':')[0]}</Text>
            </TouchableOpacity>
            <Text style={styles.timeSeparator}>:</Text>
            <TouchableOpacity 
              style={styles.selectInputTiny}
              onPress={() => setShowMinuteModal(true)}
            >
              <Text style={styles.selectInputText}>{notificationTime.split(':')[1]}</Text>
            </TouchableOpacity>
            <Text style={styles.inlineLabel}>in</Text>
            <TouchableOpacity 
              style={styles.selectInputTiny}
              onPress={() => setShowDaysModal(true)}
            >
              <Text style={styles.selectInputText}>{notificationDaysBefore}</Text>
            </TouchableOpacity>
            <Text style={styles.inlineLabel}>days</Text>
          </View>
          {renderButton('Test Notification Now', handleTestNotification)}
        </>
      ))}

      {renderSection('Payment Methods', (
        <>
          {renderButton('Manage Payment Methods', () => {
            navigation.navigate('PaymentMethods');
          })}
        </>
      ))}

      {renderSection(t('settings.dataBackup'), (
        <>
          {renderButton('Backup & Restore', () => {
            navigation.navigate('BackupRestore');
          })}
        </>
      ))}

      {renderSection(t('settings.advanced'), (
        <>
          {renderToggleItem(
            t('settings.developerMode'),
            developerMode,
            handleDeveloperModeToggle
          )}
        </>
      ))}

      {developerMode && renderSection(t('settings.developerMode'), (
        <>
          {renderButton(t('settings.viewLogs'), () => {
            navigation.navigate('LogViewer');
          })}
          {renderButton(t('settings.regenerateSkip'), handleRegeneratePaymentsSkip)}
          {renderButton(t('settings.regenerateDelete'), handleRegeneratePaymentsDelete, true)}
          {renderButton(t('settings.resetAll'), handleDataReset, true)}
        </>
      ))}
      
      <Modal
        visible={showHourModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHourModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowHourModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Hour</Text>
            <ScrollView style={styles.modalScrollView}>
              {hourOptions.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={styles.modalOption}
                  onPress={() => handleHourSelect(hour)}
                >
                  <Text style={styles.modalOptionText}>{hour}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showMinuteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMinuteModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMinuteModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Minute</Text>
            <ScrollView style={styles.modalScrollView}>
              {minuteOptions.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={styles.modalOption}
                  onPress={() => handleMinuteSelect(minute)}
                >
                  <Text style={styles.modalOptionText}>{minute}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showDaysModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDaysModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDaysModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Days Before Due Date</Text>
            <ScrollView style={styles.modalScrollView}>
              {daysOptions.map((days) => (
                <TouchableOpacity
                  key={days}
                  style={styles.modalOption}
                  onPress={() => handleDaysSelect(String(days))}
                >
                  <Text style={styles.modalOptionText}>{days} day{days > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
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
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  singleLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  input: {
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 100,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginHorizontal: 4,
  },
  selectInputTiny: {
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 50,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  selectInputText: {
    fontSize: 16,
    color: COLORS.text.primary,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDestructive: {
    backgroundColor: COLORS.error,
  },
  buttonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextDestructive: {
    color: COLORS.text.inverse,
  },
});

export default Settings;