/**
 * File: src/constants/categories.js
 * Description: Application constants for categories, currencies, and recurring options
 * Version: 2.0.0
 * Last Updated: 2025-10-04
 * Changes: Added WEEKDAYS, MONTHS, DAYS_IN_MONTH constants for Phase 1 recurring options
 *          Added helper functions: getWeekdayName, getMonthName
 */

// Bill categories
export const CATEGORIES = [
  { id: 'credit_card', key: 'credit_card', icon: '💳' },
  { id: 'rent', key: 'rent', icon: '🏠' },
  { id: 'utility', key: 'utility', icon: '💡' },
  { id: 'internet', key: 'internet', icon: '🌐' },
  { id: 'phone', key: 'phone', icon: '📱' },
  { id: 'insurance', key: 'insurance', icon: '🛡️' },
  { id: 'subscription', key: 'subscription', icon: '📺' },
  { id: 'loan', key: 'loan', icon: '🏦' },
  { id: 'other', key: 'other', icon: '📋' },
];

// Repeat options
export const REPEAT_OPTIONS = [
  { id: 'weekly', key: 'weekly', value: 'weekly' },
  { id: 'monthly', key: 'monthly', value: 'monthly' },
  { id: 'yearly', key: 'yearly', value: 'yearly' },
  { id: 'custom', key: 'custom', value: 'custom' },
];

// Days of week (0 = Sunday)
export const WEEKDAYS = [
  { id: 0, key: 'sunday', short: 'Sun', name: 'Sunday' },
  { id: 1, key: 'monday', short: 'Mon', name: 'Monday' },
  { id: 2, key: 'tuesday', short: 'Tue', name: 'Tuesday' },
  { id: 3, key: 'wednesday', short: 'Wed', name: 'Wednesday' },
  { id: 4, key: 'thursday', short: 'Thu', name: 'Thursday' },
  { id: 5, key: 'friday', short: 'Fri', name: 'Friday' },
  { id: 6, key: 'saturday', short: 'Sat', name: 'Saturday' },
];

// Months
export const MONTHS = [
  { id: 1, key: 'january', short: 'Jan', name: 'January' },
  { id: 2, key: 'february', short: 'Feb', name: 'February' },
  { id: 3, key: 'march', short: 'Mar', name: 'March' },
  { id: 4, key: 'april', short: 'Apr', name: 'April' },
  { id: 5, key: 'may', short: 'May', name: 'May' },
  { id: 6, key: 'june', short: 'Jun', name: 'June' },
  { id: 7, key: 'july', short: 'Jul', name: 'July' },
  { id: 8, key: 'august', short: 'Aug', name: 'August' },
  { id: 9, key: 'september', short: 'Sep', name: 'September' },
  { id: 10, key: 'october', short: 'Oct', name: 'October' },
  { id: 11, key: 'november', short: 'Nov', name: 'November' },
  { id: 12, key: 'december', short: 'Dec', name: 'December' },
];

// Days in month (1-31)
export const DAYS_IN_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

// Reminder units
export const REMINDER_UNITS = [
  { id: 'day', key: 'day', value: 'day' },
  { id: 'week', key: 'week', value: 'week' },
  { id: 'month', key: 'month', value: 'month' },
];

// Reminder types
export const REMINDER_TYPES = [
  { id: 'due', key: 'on_due_date', value: 'due' },
  { id: 'before_due', key: 'before_due_date', value: 'before_due' },
];

// Payment method types
export const PAYMENT_METHOD_TYPES = [
  { id: 'bank_transfer', key: 'bank_transfer', icon: '🏦' },
  { id: 'credit_card', key: 'credit_card', icon: '💳' },
  { id: 'debit_card', key: 'debit_card', icon: '💳' },
  { id: 'cash', key: 'cash', icon: '💵' },
  { id: 'check', key: 'check', icon: '📝' },
  { id: 'auto_payment', key: 'auto_payment', icon: '🤖' },
  { id: 'other', key: 'other', icon: '📋' },
];

// Currencies
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

// Languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

// Helper functions
export const getCategoryIcon = (categoryId) => {
  const category = CATEGORIES.find(c => c.id === categoryId);
  return category ? category.icon : '📋';
};

export const getCurrencySymbol = (currencyCode) => {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.symbol : '$';
};

export const getRepeatLabel = (repeatValue) => {
  const repeat = REPEAT_OPTIONS.find(r => r.value === repeatValue);
  return repeat ? repeat.key : 'monthly';
};

export const getWeekdayName = (dayOfWeek) => {
  const weekday = WEEKDAYS.find(w => w.id === dayOfWeek);
  return weekday ? weekday.name : '';
};

export const getMonthName = (monthId) => {
  const month = MONTHS.find(m => m.id === monthId);
  return month ? month.name : '';
};