import { getDatabase } from './init';
import { getCurrentDateTimeUTC, getDateString, getCurrentDate, addMonths } from '../utils/dateUtils';
import { logAction } from './logs';

// Get all payments
export const getAllPayments = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT 
        p.*,
        a.name as account_name,
        a.category,
        a.bank_account,
        a.currency
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      ORDER BY p.due_date ASC
    `);
    return result;
  } catch (error) {
    console.error('Error getting all payments:', error);
    throw error;
  }
};

// Get payments for next N months
export const getPaymentsForNextMonths = async (months = 3) => {
  const db = getDatabase();
  try {
    const currentDate = getDateString(getCurrentDate());
    const endDate = getDateString(addMonths(getCurrentDate(), months));
    
    const result = await db.getAllAsync(`
      SELECT 
        p.*,
        a.name as account_name,
        a.category,
        a.bank_account,
        a.currency
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.due_date >= ? AND p.due_date <= ?
      ORDER BY p.due_date ASC
    `, [currentDate, endDate]);
    
    return result;
  } catch (error) {
    console.error('Error getting payments for next months:', error);
    throw error;
  }
};

// Get payment by ID
export const getPaymentById = async (id) => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(`
      SELECT 
        p.*,
        a.name as account_name,
        a.category,
        a.bank_account,
        a.currency
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.id = ?
    `, [id]);
    return result;
  } catch (error) {
    console.error('Error getting payment by ID:', error);
    throw error;
  }
};

// Get payments by account ID
export const getPaymentsByAccountId = async (accountId) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM payments
      WHERE account_id = ?
      ORDER BY due_date DESC
    `, [accountId]);
    return result;
  } catch (error) {
    console.error('Error getting payments by account ID:', error);
    throw error;
  }
};

// Create payment
export const createPayment = async (paymentData) => {
  const db = getDatabase();
  try {
    const now = getCurrentDateTimeUTC();
    
    const result = await db.runAsync(`
      INSERT INTO payments (account_id, due_date, amount, is_paid, paid_date, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paymentData.account_id,
      paymentData.due_date,
      paymentData.amount,
      paymentData.is_paid || 0,
      paymentData.paid_date || null,
      paymentData.note || null,
      now,
      now,
    ]);
    
    await logAction('CREATE', 'payments', result.lastInsertRowId, paymentData);
    
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

// Update payment
export const updatePayment = async (id, paymentData) => {
  const db = getDatabase();
  try {
    const now = getCurrentDateTimeUTC();
    
    await db.runAsync(`
      UPDATE payments
      SET account_id = ?,
          due_date = ?,
          amount = ?,
          is_paid = ?,
          paid_date = ?,
          note = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      paymentData.account_id,
      paymentData.due_date,
      paymentData.amount,
      paymentData.is_paid,
      paymentData.paid_date,
      paymentData.note,
      now,
      id,
    ]);
    
    await logAction('UPDATE', 'payments', id, paymentData);
    
    return true;
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
};

// Toggle payment status (paid/unpaid)
export const togglePaymentStatus = async (id) => {
  const db = getDatabase();
  try {
    const payment = await getPaymentById(id);
    const newStatus = payment.is_paid ? 0 : 1;
    const paidDate = newStatus ? getCurrentDateTimeUTC() : null;
    const now = getCurrentDateTimeUTC();
    
    await db.runAsync(`
      UPDATE payments
      SET is_paid = ?,
          paid_date = ?,
          updated_at = ?
      WHERE id = ?
    `, [newStatus, paidDate, now, id]);
    
    await logAction('TOGGLE_STATUS', 'payments', id, { 
      old_status: payment.is_paid, 
      new_status: newStatus,
      paid_date: paidDate 
    });
    
    return true;
  } catch (error) {
    console.error('Error toggling payment status:', error);
    throw error;
  }
};

// Mark payment as paid
export const markAsPaid = async (id, note = null) => {
  const db = getDatabase();
  try {
    const now = getCurrentDateTimeUTC();
    
    await db.runAsync(`
      UPDATE payments
      SET is_paid = 1,
          paid_date = ?,
          note = ?,
          updated_at = ?
      WHERE id = ?
    `, [now, note, now, id]);
    
    await logAction('MARK_PAID', 'payments', id, { paid_date: now, note });
    
    return true;
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    throw error;
  }
};

// Mark payment as unpaid
export const markAsUnpaid = async (id) => {
  const db = getDatabase();
  try {
    const now = getCurrentDateTimeUTC();
    
    await db.runAsync(`
      UPDATE payments
      SET is_paid = 0,
          paid_date = NULL,
          updated_at = ?
      WHERE id = ?
    `, [now, id]);
    
    await logAction('MARK_UNPAID', 'payments', id, null);
    
    return true;
  } catch (error) {
    console.error('Error marking payment as unpaid:', error);
    throw error;
  }
};

// Delete payment
export const deletePayment = async (id) => {
  const db = getDatabase();
  try {
    const payment = await getPaymentById(id);
    
    await db.runAsync('DELETE FROM payments WHERE id = ?', [id]);
    
    await logAction('DELETE', 'payments', id, payment);
    
    return true;
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

// Delete all payments for an account
export const deletePaymentsByAccountId = async (accountId) => {
  const db = getDatabase();
  try {
    await db.runAsync('DELETE FROM payments WHERE account_id = ?', [accountId]);
    
    await logAction('DELETE_BY_ACCOUNT', 'payments', accountId, null);
    
    return true;
  } catch (error) {
    console.error('Error deleting payments by account ID:', error);
    throw error;
  }
};

// Check if payment exists
export const paymentExists = async (accountId, dueDate) => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(`
      SELECT id FROM payments
      WHERE account_id = ? AND due_date = ?
    `, [accountId, dueDate]);
    
    return result !== null;
  } catch (error) {
    console.error('Error checking payment existence:', error);
    throw error;
  }
};

// Get overdue payments
export const getOverduePayments = async () => {
  const db = getDatabase();
  try {
    const currentDate = getDateString(getCurrentDate());
    
    const result = await db.getAllAsync(`
      SELECT 
        p.*,
        a.name as account_name,
        a.category,
        a.bank_account,
        a.currency
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.due_date < ? AND p.is_paid = 0
      ORDER BY p.due_date ASC
    `, [currentDate]);
    
    return result;
  } catch (error) {
    console.error('Error getting overdue payments:', error);
    throw error;
  }
};

// Get due soon payments (within N days)
export const getDueSoonPayments = async (days = 3) => {
  const db = getDatabase();
  try {
    const currentDate = getDateString(getCurrentDate());
    const endDate = getDateString(addMonths(getCurrentDate(), 0).setDate(getCurrentDate().getDate() + days));
    
    const result = await db.getAllAsync(`
      SELECT 
        p.*,
        a.name as account_name,
        a.category,
        a.bank_account,
        a.currency
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.due_date >= ? AND p.due_date <= ? AND p.is_paid = 0
      ORDER BY p.due_date ASC
    `, [currentDate, endDate]);
    
    return result;
  } catch (error) {
    console.error('Error getting due soon payments:', error);
    throw error;
  }
};

// Get Payments by month
export const getPaymentsByMonth = async (monthKey) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT 
        p.*,
        a.name as account_name,
        a.category,
        a.bank_account,
        a.currency
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE strftime('%Y-%m', p.due_date) = ?
      ORDER BY p.due_date ASC
    `, [monthKey]);
    return result;
  } catch (error) {
    console.error('Error getting payments by month:', error);
    throw error;
  }
};

export default {
  getAllPayments,
  getPaymentsForNextMonths,
  getPaymentById,
  getPaymentsByAccountId,
  createPayment,
  updatePayment,
  togglePaymentStatus,
  markAsPaid,
  markAsUnpaid,
  deletePayment,
  deletePaymentsByAccountId,
  paymentExists,
  getOverduePayments,
  getDueSoonPayments,
};