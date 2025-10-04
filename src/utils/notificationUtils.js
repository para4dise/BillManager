/**
 * File: src/utils/notificationUtils.js
 * Description: Push notification utilities for bill reminders
 * Version: 1.0.0
 * Last Updated: 2025-10-04
 * Changes: Initial version - notification checking and scheduling
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllPayments } from '../database/payments';
import { getCurrentDate } from './dateUtils';
import { getCurrencySymbol } from '../constants/categories';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export const requestNotificationPermissions = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Bill Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Get bills summary for notification
export const getBillsSummary = async (daysWithin = 3) => {
  try {
    const allPayments = await getAllPayments();
    const today = getCurrentDate();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + daysWithin);

    let overdueCount = 0;
    let dueSoonCount = 0;
    let overdueAmount = 0;
    let dueSoonAmount = 0;
    const overdueBills = [];
    const dueSoonBills = [];

    allPayments.forEach(payment => {
      if (payment.is_paid) return;

      const dueDate = new Date(payment.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        // Overdue
        overdueCount++;
        overdueAmount += payment.amount;
        overdueBills.push(payment);
      } else if (dueDate <= maxDate) {
        // Due within N days
        dueSoonCount++;
        dueSoonAmount += payment.amount;
        dueSoonBills.push(payment);
      }
    });

    return {
      overdueCount,
      dueSoonCount,
      overdueAmount,
      dueSoonAmount,
      totalCount: overdueCount + dueSoonCount,
      totalAmount: overdueAmount + dueSoonAmount,
      overdueBills,
      dueSoonBills,
      daysWithin,
    };
  } catch (error) {
    console.error('Error getting bills summary:', error);
    return null;
  }
};

// Format notification message
export const formatNotificationMessage = (summary, currency = 'USD') => {
  if (!summary || summary.totalCount === 0) {
    return null;
  }

  const currencySymbol = getCurrencySymbol(currency);
  let title = 'Bill Reminder';
  let body = '';

  if (summary.overdueCount > 0 && summary.dueSoonCount > 0) {
    title = `${summary.totalCount} Bills Need Attention`;
    body = `🔴 ${summary.overdueCount} Overdue bill${summary.overdueCount > 1 ? 's' : ''} (${currencySymbol}${summary.overdueAmount.toFixed(2)})\n`;
    body += `⚠️ ${summary.dueSoonCount} bill${summary.dueSoonCount > 1 ? 's' : ''} due within ${summary.daysWithin} days (${currencySymbol}${summary.dueSoonAmount.toFixed(2)})\n`;
    body += `Total: ${currencySymbol}${summary.totalAmount.toFixed(2)}`;
  } else if (summary.overdueCount > 0) {
    title = `${summary.overdueCount} Overdue Bill${summary.overdueCount > 1 ? 's' : ''}`;
    body = `🔴 You have ${summary.overdueCount} overdue bill${summary.overdueCount > 1 ? 's' : ''}\n`;
    body += `Total: ${currencySymbol}${summary.overdueAmount.toFixed(2)}`;
  } else {
    title = `${summary.dueSoonCount} Bill${summary.dueSoonCount > 1 ? 's' : ''} Due Soon`;
    body = `⚠️ ${summary.dueSoonCount} bill${summary.dueSoonCount > 1 ? 's' : ''} due within ${summary.daysWithin} days\n`;
    body += `Total: ${currencySymbol}${summary.dueSoonAmount.toFixed(2)}`;
  }

  return { title, body };
};

// Send notification
export const sendBillNotification = async (summary, currency = 'USD') => {
  try {
    const message = formatNotificationMessage(summary, currency);
    if (!message) {
      console.log('No bills to notify');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });

    console.log('Notification sent:', message.title);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Schedule daily notification
export const scheduleDailyNotification = async () => {
  try {
    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Get settings
    const settings = await AsyncStorage.multiGet([
      'notification_enabled',
      'notification_time',
      'notification_days_before',
      'currency',
    ]);

    const settingsObj = {};
    settings.forEach(([key, value]) => {
      settingsObj[key] = value;
    });

    const enabled = settingsObj.notification_enabled === 'true';
    if (!enabled) {
      console.log('Notifications disabled');
      return;
    }

    const time = settingsObj.notification_time || '09:00';
    const daysWithin = parseInt(settingsObj.notification_days_before || '3');
    const currency = settingsObj.currency || 'USD';

    // Parse time (HH:MM)
    const [hour, minute] = time.split(':').map(Number);

    // Schedule notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Checking your bills...',
        body: 'Bill Manager is checking for upcoming payments',
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    console.log(`Daily notification scheduled at ${time}`);
  } catch (error) {
    console.error('Error scheduling daily notification:', error);
  }
};

// Check and send notification (call this on app startup and daily)
export const checkAndNotify = async () => {
  try {
    // Check if notifications are enabled
    const enabled = await AsyncStorage.getItem('notification_enabled');
    if (enabled !== 'true') {
      return;
    }

    // Get settings
    const daysWithin = parseInt(await AsyncStorage.getItem('notification_days_before') || '3');
    const currency = await AsyncStorage.getItem('currency') || 'USD';

    // Get bills summary
    const summary = await getBillsSummary(daysWithin);

    // Send notification if there are bills
    if (summary && summary.totalCount > 0) {
      await sendBillNotification(summary, currency);
    }
  } catch (error) {
    console.error('Error checking and notifying:', error);
  }
};

// Initialize notifications (call on app startup)
export const initializeNotifications = async () => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (hasPermission) {
      await scheduleDailyNotification();
      console.log('Notifications initialized');
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
};

export default {
  requestNotificationPermissions,
  getBillsSummary,
  formatNotificationMessage,
  sendBillNotification,
  scheduleDailyNotification,
  checkAndNotify,
  initializeNotifications,
};