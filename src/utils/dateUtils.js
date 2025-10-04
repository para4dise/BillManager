/**
 * File: src/utils/dateUtils.js
 * Description: Date utility functions for payment scheduling and formatting
 * Version: 2.1.1
 * Last Updated: 2025-10-04
 * Changes: v2.1.1 - Fixed to start from first repeat (iteration 1), not start_date itself
 *          v2.1.0 - Modified to include past payments from start_date
 *          v2.0.0 - Updated for Phase 1 recurring options
 */

import { format, parseISO, addDays, addWeeks, addMonths as addMonthsFns, addYears, differenceInDays, isAfter, isBefore, startOfDay, endOfDay, setDay, setDate, setMonth } from 'date-fns';

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

// Calculate next payment date based on repeat pattern (Phase 1)
export const getNextPaymentDate = (startDate, repeatType, count = 1, recurringDetails = {}) => {
  const date = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const { dayOfWeek, dayOfMonth, monthOfYear, dayOfYear } = recurringDetails;
  
  switch (repeatType) {
    case 'weekly':
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        // Set to specific day of week
        let nextDate = setDay(date, dayOfWeek, { weekStartsOn: 0 });
        // If the target day is before or same as start date, move to next week
        if (!isAfter(nextDate, date)) {
          nextDate = addWeeks(nextDate, 1);
        }
        // Add weeks based on count
        return addWeeks(nextDate, count - 1);
      }
      return addWeeks(date, count);
      
    case 'monthly':
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        // Set to specific day of month
        let nextDate = setDate(date, Math.min(dayOfMonth, 28)); // Safe day
        
        // If the target day is before or same as start date, move to next month
        if (!isAfter(nextDate, date)) {
          nextDate = addMonthsFns(nextDate, 1);
        }
        
        // Add months based on count
        nextDate = addMonthsFns(nextDate, count - 1);
        
        // Handle day of month overflow (e.g., Feb 31 -> Feb 28/29)
        try {
          nextDate = setDate(nextDate, dayOfMonth);
        } catch (e) {
          // If day doesn't exist in month, use last day of month
          const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate = setDate(nextDate, Math.min(dayOfMonth, lastDayOfMonth));
        }
        
        return nextDate;
      }
      return addMonthsFns(date, count);
      
    case 'yearly':
      if (monthOfYear !== null && monthOfYear !== undefined && dayOfYear !== null && dayOfYear !== undefined) {
        // Set to specific month and day
        let nextDate = new Date(date.getFullYear(), monthOfYear - 1, 1);
        
        // Handle day overflow
        const lastDayOfMonth = new Date(nextDate.getFullYear(), monthOfYear, 0).getDate();
        const safeDay = Math.min(dayOfYear, lastDayOfMonth);
        nextDate = setDate(nextDate, safeDay);
        
        // If the target date is before or same as start date, move to next year
        if (!isAfter(nextDate, date)) {
          nextDate = addYears(nextDate, 1);
          // Reapply day (for leap year handling)
          const lastDay = new Date(nextDate.getFullYear(), monthOfYear, 0).getDate();
          nextDate = setDate(nextDate, Math.min(dayOfYear, lastDay));
        }
        
        // Add years based on count
        nextDate = addYears(nextDate, count - 1);
        
        // Reapply day (for leap year handling)
        const finalLastDay = new Date(nextDate.getFullYear(), monthOfYear, 0).getDate();
        nextDate = setDate(nextDate, Math.min(dayOfYear, finalLastDay));
        
        return nextDate;
      }
      return addYears(date, count);
      
    default:
      return addMonthsFns(date, count); // Default to monthly
  }
};

// Generate payment dates for next N months (Phase 1)
export const generatePaymentDates = (startDate, repeatType, months = 3, endDate = null, recurringDetails = {}) => {
  const dates = [];
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? parseISO(endDate) : endDate) : null;
  const currentDate = getCurrentDate();
  
  // Start from iteration 1 (first repeat), not 0 (start date itself)
  let iteration = 1;
  let nextDate = getNextPaymentDate(start, repeatType, iteration, recurringDetails);
  
  // Generate dates from first repeat up to current + N months
  const maxDate = addMonthsFns(currentDate, months);
  
  while (isBefore(nextDate, maxDate) || format(nextDate, 'yyyy-MM') === format(maxDate, 'yyyy-MM')) {
    // Check if we've passed the end date
    if (end && isAfter(nextDate, end)) {
      break;
    }
    
    // Add date (including past dates from start_date)
    dates.push(getDateString(nextDate));
    iteration++;
    nextDate = getNextPaymentDate(start, repeatType, iteration, recurringDetails);
    
    // Safety check to prevent infinite loop
    if (iteration > 1000) {
      console.error('Too many iterations in generatePaymentDates');
      break;
    }
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