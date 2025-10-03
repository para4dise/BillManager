import { format, parseISO, addDays, addWeeks, addMonths as addMonthsFns, addYears, differenceInDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

// Get current date without time (local timezone)
export const getCurrentDate = () => {
  return startOfDay(new Date());
};

// Get current datetime in UTC ISO format
export const getCurrentDateTimeUTC = () => {
  return new Date().toISOString();
};

// Get date only string (YYYY-MM-DD)
export const getDateString = (date) => {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
};

// Format date for display (localized)
export const formatDate = (dateString, formatString = 'MMM d, yyyy') => {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Format datetime for display (localized)
export const formatDateTime = (dateTimeString, formatString = 'MMM d, yyyy HH:mm') => {
  if (!dateTimeString) return '';
  try {
    const date = parseISO(dateTimeString);
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return dateTimeString;
  }
};

// Add months helper
export const addMonths = (date, months) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addMonthsFns(d, months);
};

// Calculate next payment date based on repeat pattern
export const getNextPaymentDate = (startDate, repeatType, count = 1) => {
  const date = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  
  switch (repeatType) {
    case 'weekly':
      return addWeeks(date, count);
    case 'monthly':
      return addMonthsFns(date, count);
    case 'yearly':
      return addYears(date, count);
    default:
      return addMonthsFns(date, count); // Default to monthly
  }
};

// Generate payment dates for next N months
export const generatePaymentDates = (startDate, repeatType, months = 3, endDate = null) => {
  const dates = [];
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? parseISO(endDate) : endDate) : null;
  const currentDate = getCurrentDate();
  
  let nextDate = start;
  let iteration = 0;
  
  // Start from current date or start date, whichever is later
  while (isBefore(nextDate, currentDate)) {
    iteration++;
    nextDate = getNextPaymentDate(start, repeatType, iteration);
  }
  
  // Generate dates for next N months
  const maxDate = addMonthsFns(currentDate, months);
  
  while (isBefore(nextDate, maxDate) || format(nextDate, 'yyyy-MM') === format(maxDate, 'yyyy-MM')) {
    // Check if we've passed the end date
    if (end && isAfter(nextDate, end)) {
      break;
    }
    
    dates.push(getDateString(nextDate));
    iteration++;
    nextDate = getNextPaymentDate(start, repeatType, iteration);
  }
  
  return dates;
};

// Check if date is overdue
export const isOverdue = (dueDate, isPaid) => {
  if (isPaid) return false;
  const due = parseISO(dueDate);
  const current = getCurrentDate();
  return isAfter(current, due);
};

// Check if date is due soon (within N days)
export const isDueSoon = (dueDate, isPaid, daysThreshold = 3) => {
  if (isPaid) return false;
  const due = parseISO(dueDate);
  const current = getCurrentDate();
  const diff = differenceInDays(due, current);
  return diff >= 0 && diff <= daysThreshold;
};

// Get payment status
export const getPaymentStatus = (dueDate, isPaid) => {
  if (isPaid) return 'paid';
  if (isOverdue(dueDate, isPaid)) return 'overdue';
  if (isDueSoon(dueDate, isPaid)) return 'dueSoon';
  return 'unpaid';
};

// Group dates by month
export const groupDatesByMonth = (dates) => {
  const grouped = {};
  
  dates.forEach(dateString => {
    const date = parseISO(dateString);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    
    grouped[monthKey].push(dateString);
  });
  
  return grouped;
};

// Get month name
export const getMonthName = (dateString) => {
  const date = parseISO(dateString);
  return format(date, 'MMMM');
};

// Get day of week
export const getDayOfWeek = (dateString) => {
  const date = parseISO(dateString);
  return format(date, 'EEE');
};

// Get day of month
export const getDayOfMonth = (dateString) => {
  const date = parseISO(dateString);
  return format(date, 'd');
};

// Check if two dates are the same day
export const isSameDay = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
};

export default {
  getCurrentDate,
  getCurrentDateTimeUTC,
  getDateString,
  formatDate,
  formatDateTime,
  addMonths,
  getNextPaymentDate,
  generatePaymentDates,
  isOverdue,
  isDueSoon,
  getPaymentStatus,
  groupDatesByMonth,
  getMonthName,
  getDayOfWeek,
  getDayOfMonth,
  isSameDay,
};