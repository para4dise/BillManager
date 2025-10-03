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