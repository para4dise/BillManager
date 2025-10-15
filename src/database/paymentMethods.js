/**
 * File: src/database/paymentMethods.js
 * Description: Database CRUD operations for payment_methods table
 * Version: 1.0.0
 * Last Updated: 2025-10-05
 * Changes: v1.0.0 - Initial implementation
 */

import { getDatabase } from './init';
import { getCurrentDateTimeUTC } from '../utils/dateUtils';
import { logAction } from './logs';

// Get all active payment methods
export const getAllPaymentMethods = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM payment_methods
      WHERE is_active = 1
      ORDER BY name ASC
    `);
    return result;
  } catch (error) {
    console.error('Error getting all payment methods:', error);
    throw error;
  }
};

// Get payment method by ID
export const getPaymentMethodById = async (id) => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(`
      SELECT * FROM payment_methods WHERE id = ?
    `, [id]);
    return result;
  } catch (error) {
    console.error('Error getting payment method by ID:', error);
    throw error;
  }
};

// Create payment method
export const createPaymentMethod = async (methodData) => {
  const db = getDatabase();
  try {
    const now = getCurrentDateTimeUTC();
    
    const result = await db.runAsync(`
      INSERT INTO payment_methods (name, type, is_active, created_at)
      VALUES (?, ?, ?, ?)
    `, [
      methodData.name,
      methodData.type,
      1,
      now,
    ]);
    
    await logAction('CREATE', 'payment_methods', result.lastInsertRowId, methodData);
    
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating payment method:', error);
    throw error;
  }
};

// Update payment method
export const updatePaymentMethod = async (id, methodData) => {
  const db = getDatabase();
  try {
    await db.runAsync(`
      UPDATE payment_methods
      SET name = ?,
          type = ?
      WHERE id = ?
    `, [
      methodData.name,
      methodData.type,
      id,
    ]);
    
    await logAction('UPDATE', 'payment_methods', id, methodData);
    
    return true;
  } catch (error) {
    console.error('Error updating payment method:', error);
    throw error;
  }
};

// Delete payment method (soft delete)
export const deletePaymentMethod = async (id) => {
  const db = getDatabase();
  try {
    const method = await getPaymentMethodById(id);
    
    // Soft delete - mark as inactive
    await db.runAsync(`
      UPDATE payment_methods
      SET is_active = 0
      WHERE id = ?
    `, [id]);
    
    await logAction('DELETE', 'payment_methods', id, method);
    
    return true;
  } catch (error) {
    console.error('Error deleting payment method:', error);
    throw error;
  }
};

// Hard delete payment method (permanent)
export const hardDeletePaymentMethod = async (id) => {
  const db = getDatabase();
  try {
    const method = await getPaymentMethodById(id);
    
    await db.runAsync('DELETE FROM payment_methods WHERE id = ?', [id]);
    
    await logAction('HARD_DELETE', 'payment_methods', id, method);
    
    return true;
  } catch (error) {
    console.error('Error hard deleting payment method:', error);
    throw error;
  }
};

// Get active payment methods count
export const getActivePaymentMethodsCount = async () => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM payment_methods WHERE is_active = 1
    `);
    return result.count;
  } catch (error) {
    console.error('Error getting active payment methods count:', error);
    throw error;
  }
};

export default {
  getAllPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  hardDeletePaymentMethod,
  getActivePaymentMethodsCount,
};