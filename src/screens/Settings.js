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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { LANGUAGES, CURRENCIES } from '../constants/categories';
import { regeneratePaymentsForAllAccounts, generatePaymentsForAllAccounts } from '../utils/paymentGenerator';
import { resetAllData, dropAllTables } from '../database/init';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState('09:00');
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
            case 'developer_mode':
              setDeveloperMode(value === 'true');
              break;
          }
        }
      });
      
      // Set language from i18n if not saved in AsyncStorage
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

  const handleExportData = () => {
    Alert.alert(
      t('settings.export'),
      'Export functionality will be implemented',
      [{ text: t('common.confirm') }]
    );
  };

  const handleImportData = () => {
    Alert.alert(
      t('settings.import'),
      'Import functionality will be implemented',
      [{ text: t('common.confirm') }]
    );
  };

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
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t('settings.notificationTime')}</Text>
            <TextInput
              style={styles.input}
              value={notificationTime}
              onChangeText={setNotificationTime}
              onBlur={() => saveSetting('notification_time', notificationTime)}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.text.secondary}
            />
          </View>
        </>
      ))}

      {renderSection('Payment Methods', (
        <>
          {renderButton('Manage Payment Methods', () => {
            Alert.alert('Payment Methods', 'Payment methods management will be implemented');
          })}
        </>
      ))}

      {renderSection(t('settings.dataBackup'), (
        <>
          {renderButton(t('settings.export'), handleExportData)}
          {renderButton(t('settings.import'), handleImportData)}
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
            Alert.alert('Logs', 'Log viewer will be implemented');
          })}
          {renderButton(t('settings.regenerateSkip'), handleRegeneratePaymentsSkip)}
          {renderButton(t('settings.regenerateDelete'), handleRegeneratePaymentsDelete, true)}
          {renderButton(t('settings.resetAll'), handleDataReset, true)}
        </>
      ))}
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