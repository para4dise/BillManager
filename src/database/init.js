/**
 * File: src/database/init.js
 * Description: Database initialization and table creation with migration support
 * Version: 2.0.0
 * Last Updated: 2025-10-04
 * Changes: Added Phase 1 recurring fields (day_of_week, day_of_month, month_of_year, day_of_year)
 *          Added migration function to update existing tables
 */

import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'billmanager.db';

let db = null;

// Initialize database connection
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await createTables();
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Create all tables
const createTables = async () => {
  const database = getDatabase();
  
  try {
    // Run migrations first
    await runMigrations();
    
    // Accounts table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        bank_account TEXT,
        notes TEXT,
        amount REAL,
        currency TEXT DEFAULT 'USD',
        repeats TEXT DEFAULT 'monthly',
        start_date TEXT NOT NULL,
        has_end_date INTEGER DEFAULT 0,
        end_date TEXT,
        day_of_week INTEGER,
        day_of_month INTEGER,
        month_of_year INTEGER,
        day_of_year INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Payments table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        amount REAL NOT NULL,
        is_paid INTEGER DEFAULT 0,
        paid_date TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        UNIQUE(account_id, due_date)
      );
    `);

    // Reminders table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        remind_value INTEGER NOT NULL,
        remind_unit TEXT NOT NULL,
        remind_type TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `);

    // Payment methods table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );
    `);

    // Logs table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id INTEGER,
        details TEXT,
        timestamp TEXT NOT NULL
      );
    `);

    // Settings table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // Create indexes for better performance
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);
      CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
      CREATE INDEX IF NOT EXISTS idx_payments_is_paid ON payments(is_paid);
      CREATE INDEX IF NOT EXISTS idx_reminders_account_id ON reminders(account_id);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_table_name ON logs(table_name);
    `);

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

// Drop all tables (for reset functionality)
export const dropAllTables = async () => {
  const database = getDatabase();
  
  try {
    await database.execAsync(`
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS reminders;
      DROP TABLE IF EXISTS accounts;
      DROP TABLE IF EXISTS payment_methods;
      DROP TABLE IF EXISTS logs;
      DROP TABLE IF EXISTS settings;
    `);
    
    console.log('All tables dropped successfully');
    
    // Recreate tables
    await createTables();
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  }
};

// Reset all data (delete all records but keep tables)
export const resetAllData = async () => {
  const database = getDatabase();
  
  try {
    await database.execAsync(`
      DELETE FROM payments;
      DELETE FROM reminders;
      DELETE FROM accounts;
      DELETE FROM payment_methods;
      DELETE FROM settings;
    `);
    
    console.log('All data reset successfully');
  } catch (error) {
    console.error('Error resetting data:', error);
    throw error;
  }
};

// Check if database is initialized
export const isDatabaseInitialized = () => {
  return db !== null;
};

// Run database migrations
const runMigrations = async () => {
  const database = getDatabase();
  
  try {
    // Check if accounts table exists
    const tableInfo = await database.getAllAsync(`
      PRAGMA table_info(accounts);
    `);
    
    if (tableInfo.length > 0) {
      // Check if new columns exist
      const hasNewColumns = tableInfo.some(col => col.name === 'day_of_week');
      
      if (!hasNewColumns) {
        console.log('Running migration: Adding recurring detail columns...');
        
        // Add new columns for Phase 1 recurring options
        await database.execAsync(`
          ALTER TABLE accounts ADD COLUMN day_of_week INTEGER;
          ALTER TABLE accounts ADD COLUMN day_of_month INTEGER;
          ALTER TABLE accounts ADD COLUMN month_of_year INTEGER;
          ALTER TABLE accounts ADD COLUMN day_of_year INTEGER;
        `);
        
        // Migrate existing data: extract day/week info from start_date
        const accounts = await database.getAllAsync(`
          SELECT id, start_date, repeats FROM accounts WHERE is_active = 1;
        `);
        
        for (const account of accounts) {
          const startDate = new Date(account.start_date);
          
          if (account.repeats === 'weekly') {
            // Set day of week (0-6, Sunday-Saturday)
            const dayOfWeek = startDate.getDay();
            await database.runAsync(`
              UPDATE accounts SET day_of_week = ? WHERE id = ?;
            `, [dayOfWeek, account.id]);
          } else if (account.repeats === 'monthly') {
            // Set day of month (1-31)
            const dayOfMonth = startDate.getDate();
            await database.runAsync(`
              UPDATE accounts SET day_of_month = ? WHERE id = ?;
            `, [dayOfMonth, account.id]);
          } else if (account.repeats === 'yearly') {
            // Set month and day
            const monthOfYear = startDate.getMonth() + 1; // 1-12
            const dayOfYear = startDate.getDate();
            await database.runAsync(`
              UPDATE accounts SET month_of_year = ?, day_of_year = ? WHERE id = ?;
            `, [monthOfYear, dayOfYear, account.id]);
          }
        }
        
        console.log('Migration completed successfully');
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    // Don't throw - table might not exist yet
  }
};

export default {
  initDatabase,
  getDatabase,
  dropAllTables,
  resetAllData,
  isDatabaseInitialized,
};