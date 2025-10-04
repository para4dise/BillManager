/**
 * File: src/database/logs.js
 * Description: Database operations for activity logs
 * Version: 1.0.0
 * Last Updated: 2025-10-04
 * Changes: Initial version - log CRUD operations
 */

import { getDatabase } from './init';

// Log an action
export const logAction = async (action, tableName, recordId, details) => {
  const db = getDatabase();
  try {
    const timestamp = new Date().toISOString();
    const detailsJson = details ? JSON.stringify(details) : null;
    
    await db.runAsync(`
      INSERT INTO logs (action, table_name, record_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [action, tableName, recordId, detailsJson, timestamp]);
    
    console.log(`Logged: ${action} on ${tableName} (ID: ${recordId})`);
  } catch (error) {
    console.error('Error logging action:', error);
    // Don't throw - logging shouldn't break the app
  }
};

// Get all logs (newest first)
export const getAllLogs = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      ORDER BY timestamp DESC
      LIMIT 1000
    `);
    return result;
  } catch (error) {
    console.error('Error getting all logs:', error);
    throw error;
  }
};

// Get logs by action type
export const getLogsByAction = async (action) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE action = ?
      ORDER BY timestamp DESC
      LIMIT 1000
    `, [action]);
    return result;
  } catch (error) {
    console.error('Error getting logs by action:', error);
    throw error;
  }
};

// Get logs by table
export const getLogsByTable = async (tableName) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE table_name = ?
      ORDER BY timestamp DESC
      LIMIT 1000
    `, [tableName]);
    return result;
  } catch (error) {
    console.error('Error getting logs by table:', error);
    throw error;
  }
};

// Get logs for specific record
export const getLogsByRecordId = async (tableName, recordId) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE table_name = ? AND record_id = ?
      ORDER BY timestamp DESC
    `, [tableName, recordId]);
    return result;
  } catch (error) {
    console.error('Error getting logs by record ID:', error);
    throw error;
  }
};

// Get logs count
export const getLogsCount = async () => {
  const db = getDatabase();
  try {
    const result = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM logs
    `);
    return result.count;
  } catch (error) {
    console.error('Error getting logs count:', error);
    throw error;
  }
};

// Clear all logs
export const clearLogs = async () => {
  const db = getDatabase();
  try {
    await db.runAsync('DELETE FROM logs');
    console.log('All logs cleared');
    return true;
  } catch (error) {
    console.error('Error clearing logs:', error);
    throw error;
  }
};

// Clear old logs (older than N days)
export const clearOldLogs = async (daysToKeep = 30) => {
  const db = getDatabase();
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();
    
    const result = await db.runAsync(`
      DELETE FROM logs
      WHERE timestamp < ?
    `, [cutoffTimestamp]);
    
    console.log(`Cleared logs older than ${daysToKeep} days`);
    return result.changes || 0;
  } catch (error) {
    console.error('Error clearing old logs:', error);
    throw error;
  }
};

export default {
  logAction,
  getAllLogs,
  getLogsByAction,
  getLogsByTable,
  getLogsByRecordId,
  getLogsCount,
  clearLogs,
  clearOldLogs,
};