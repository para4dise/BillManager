import { getDatabase } from './init';
import { getCurrentDateTimeUTC } from '../utils/dateUtils';
import { logAction } from './logs';
import { deletePaymentsByAccountId } from './payments';

// Get all accounts
export const getAllAccounts = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM accounts
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);
    return result;
  } catch (error) {
    console.error('Error getting all accounts:', error);
    throw error;
  }
};

// Get account by ID
export const getAccountById = async (id) => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(`
      SELECT * FROM accounts WHERE id = ?
    `, [id]);
    return result;
  } catch (error) {
    console.error('Error getting account by ID:', error);
    throw error;
  }
};

// Create account
export const createAccount = async (accountData) => {
  const db = getDatabase();
  try {
    const now = getCurrentDateTimeUTC();
    
    const result = await db.runAsync(`
      INSERT INTO accounts (
        name, category, bank_account, notes, amount, currency,
        repeats, start_date, has_end_date, end_date, is_active,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      accountData.name,
      accountData.category,
      accountData.bank_account || null,
      accountData.notes || null,
      accountData.amount || null,
      accountData.currency || 'USD',
      accountData.repeats || 'monthly',
      accountData.start_date,
      accountData.has_end_date || 0,
      accountData.end_date || null,
      1,
      now,
      now,
    ]);
    
    await logAction('CREATE', 'accounts', result.lastInsertRowId, accountData);
    
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

// Update account
export const updateAccount = async (id, accountData) => {
  const db = getDatabase();
  try {
    const now = getCurrentDateTimeUTC();
    
    await db.runAsync(`
      UPDATE accounts
      SET name = ?,
          category = ?,
          bank_account = ?,
          notes = ?,
          amount = ?,
          currency = ?,
          repeats = ?,
          start_date = ?,
          has_end_date = ?,
          end_date = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      accountData.name,
      accountData.category,
      accountData.bank_account,
      accountData.notes,
      accountData.amount,
      accountData.currency,
      accountData.repeats,
      accountData.start_date,
      accountData.has_end_date,
      accountData.end_date,
      now,
      id,
    ]);
    
    await logAction('UPDATE', 'accounts', id, accountData);
    
    return true;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

// Delete account (soft delete)
export const deleteAccount = async (id) => {
  const db = getDatabase();
  try {
    const account = await getAccountById(id);
    const now = getCurrentDateTimeUTC();
    
    // Soft delete - mark as inactive
    await db.runAsync(`
      UPDATE accounts
      SET is_active = 0,
          updated_at = ?
      WHERE id = ?
    `, [now, id]);
    
    // Also delete related payments
    await deletePaymentsByAccountId(id);
    
    await logAction('DELETE', 'accounts', id, account);
    
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

// Hard delete account (permanent)
export const hardDeleteAccount = async (id) => {
  const db = getDatabase();
  try {
    const account = await getAccountById(id);
    
    // Delete related payments first
    await deletePaymentsByAccountId(id);
    
    // Then delete the account
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
    
    await logAction('HARD_DELETE', 'accounts', id, account);
    
    return true;
  } catch (error) {
    console.error('Error hard deleting account:', error);
    throw error;
  }
};

// Get active accounts count
export const getActiveAccountsCount = async () => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM accounts WHERE is_active = 1
    `);
    return result.count;
  } catch (error) {
    console.error('Error getting active accounts count:', error);
    throw error;
  }
};

// Search accounts by name or category
export const searchAccounts = async (searchTerm) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM accounts
      WHERE is_active = 1
      AND (name LIKE ? OR category LIKE ? OR bank_account LIKE ?)
      ORDER BY created_at DESC
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
    return result;
  } catch (error) {
    console.error('Error searching accounts:', error);
    throw error;
  }
};

// Get accounts by category
export const getAccountsByCategory = async (category) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM accounts
      WHERE is_active = 1 AND category = ?
      ORDER BY created_at DESC
    `, [category]);
    return result;
  } catch (error) {
    console.error('Error getting accounts by category:', error);
    throw error;
  }
};

export default {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  hardDeleteAccount,
  getActiveAccountsCount,
  searchAccounts,
  getAccountsByCategory,
};