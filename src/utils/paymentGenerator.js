import { generatePaymentDates } from './dateUtils';
import { getAllAccounts } from '../database/accounts';
import { createPayment, paymentExists, deletePaymentsByAccountId } from '../database/payments';
import { logAction } from '../database/logs';

// Generate payments for a single account
export const generatePaymentsForAccount = async (account, skipExisting = true) => {
  try {
    const dates = generatePaymentDates(
      account.start_date,
      account.repeats,
      3, // Next 3 months
      account.has_end_date ? account.end_date : null
    );
    
    let created = 0;
    let skipped = 0;
    
    for (const dueDate of dates) {
      // Check if payment already exists
      if (skipExisting && await paymentExists(account.id, dueDate)) {
        skipped++;
        continue;
      }
      
      // Create payment
      await createPayment({
        account_id: account.id,
        due_date: dueDate,
        amount: account.amount || 0,
        is_paid: 0,
        paid_date: null,
        note: null,
      });
      
      created++;
    }
    
    return { created, skipped, total: dates.length };
  } catch (error) {
    console.error('Error generating payments for account:', error);
    throw error;
  }
};

// Generate payments for all accounts
export const generatePaymentsForAllAccounts = async (skipExisting = true) => {
  try {
    const accounts = await getAllAccounts();
    
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalExpected = 0;
    
    for (const account of accounts) {
      const result = await generatePaymentsForAccount(account, skipExisting);
      totalCreated += result.created;
      totalSkipped += result.skipped;
      totalExpected += result.total;
    }
    
    await logAction('GENERATE_PAYMENTS', 'payments', null, {
      skipExisting,
      accountsProcessed: accounts.length,
      created: totalCreated,
      skipped: totalSkipped,
      expected: totalExpected,
    });
    
    return {
      accountsProcessed: accounts.length,
      created: totalCreated,
      skipped: totalSkipped,
      expected: totalExpected,
    };
  } catch (error) {
    console.error('Error generating payments for all accounts:', error);
    throw error;
  }
};

// Regenerate payments (delete existing and recreate)
export const regeneratePaymentsForAccount = async (accountId) => {
  try {
    // Get account
    const { getAccountById } = require('../database/accounts');
    const account = await getAccountById(accountId);
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Delete existing payments
    await deletePaymentsByAccountId(accountId);
    
    // Generate new payments
    const result = await generatePaymentsForAccount(account, false);
    
    await logAction('REGENERATE_PAYMENTS', 'payments', accountId, {
      created: result.created,
    });
    
    return result;
  } catch (error) {
    console.error('Error regenerating payments for account:', error);
    throw error;
  }
};

// Regenerate payments for all accounts
export const regeneratePaymentsForAllAccounts = async () => {
  try {
    const accounts = await getAllAccounts();
    
    let totalCreated = 0;
    
    for (const account of accounts) {
      // Delete existing payments
      await deletePaymentsByAccountId(account.id);
      
      // Generate new payments
      const result = await generatePaymentsForAccount(account, false);
      totalCreated += result.created;
    }
    
    await logAction('REGENERATE_ALL_PAYMENTS', 'payments', null, {
      accountsProcessed: accounts.length,
      created: totalCreated,
    });
    
    return {
      accountsProcessed: accounts.length,
      created: totalCreated,
    };
  } catch (error) {
    console.error('Error regenerating payments for all accounts:', error);
    throw error;
  }
};

// Update payments when account is modified
export const updatePaymentsForAccount = async (accountId) => {
  try {
    const { getAccountById } = require('../database/accounts');
    const account = await getAccountById(accountId);
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Get existing unpaid payments
    const { getPaymentsByAccountId } = require('../database/payments');
    const existingPayments = await getPaymentsByAccountId(accountId);
    const unpaidPayments = existingPayments.filter(p => !p.is_paid);
    
    // Update amount for unpaid payments if account amount changed
    if (account.amount) {
      const { updatePayment } = require('../database/payments');
      for (const payment of unpaidPayments) {
        if (payment.amount !== account.amount) {
          await updatePayment(payment.id, {
            ...payment,
            amount: account.amount,
          });
        }
      }
    }
    
    // Generate new payments if needed
    const result = await generatePaymentsForAccount(account, true);
    
    return result;
  } catch (error) {
    console.error('Error updating payments for account:', error);
    throw error;
  }
};

// Check and generate missing payments (run on app startup)
export const checkAndGenerateMissingPayments = async () => {
  try {
    const accounts = await getAllAccounts();
    
    let totalCreated = 0;
    
    for (const account of accounts) {
      const result = await generatePaymentsForAccount(account, true);
      totalCreated += result.created;
    }
    
    if (totalCreated > 0) {
      await logAction('AUTO_GENERATE_MISSING', 'payments', null, {
        accountsProcessed: accounts.length,
        created: totalCreated,
      });
    }
    
    return {
      accountsProcessed: accounts.length,
      created: totalCreated,
    };
  } catch (error) {
    console.error('Error checking and generating missing payments:', error);
    throw error;
  }
};

export default {
  generatePaymentsForAccount,
  generatePaymentsForAllAccounts,
  regeneratePaymentsForAccount,
  regeneratePaymentsForAllAccounts,
  updatePaymentsForAccount,
  checkAndGenerateMissingPayments,
};