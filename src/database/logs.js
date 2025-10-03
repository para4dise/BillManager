import { getDatabase } from './init';
import { getCurrentDateTimeUTC } from '../utils/dateUtils';

// Log an action
export const logAction = async (action, tableName, recordId, details) => {
  const db = getDatabase();
  try {
    const timestamp = getCurrentDateTimeUTC();
    const detailsJson = details ? JSON.stringify(details) : null;
    
    await db.runAsync(`
      INSERT INTO logs (action, table_name, record_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [action, tableName, recordId, detailsJson, timestamp]);
    
    return true;
  } catch (error) {
    console.error('Error logging action:', error);
    // Don't throw error to prevent blocking main operations
    return false;
  }
};

// Get all logs
export const getAllLogs = async () => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      ORDER BY timestamp DESC
    `);
    return result;
  } catch (error) {
    console.error('Error getting all logs:', error);
    throw error;
  }
};

// Get logs with pagination
export const getLogsPaginated = async (limit = 50, offset = 0) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    return result;
  } catch (error) {
    console.error('Error getting paginated logs:', error);
    throw error;
  }
};

// Get logs by table name
export const getLogsByTable = async (tableName) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE table_name = ?
      ORDER BY timestamp DESC
    `, [tableName]);
    return result;
  } catch (error) {
    console.error('Error getting logs by table:', error);
    throw error;
  }
};

// Get logs by action
export const getLogsByAction = async (action) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE action = ?
      ORDER BY timestamp DESC
    `, [action]);
    return result;
  } catch (error) {
    console.error('Error getting logs by action:', error);
    throw error;
  }
};

// Get logs by date range
export const getLogsByDateRange = async (startDate, endDate) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `, [startDate, endDate]);
    return result;
  } catch (error) {
    console.error('Error getting logs by date range:', error);
    throw error;
  }
};

// Get logs for a specific record
export const getLogsByRecord = async (tableName, recordId) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE table_name = ? AND record_id = ?
      ORDER BY timestamp DESC
    `, [tableName, recordId]);
    return result;
  } catch (error) {
    console.error('Error getting logs by record:', error);
    throw error;
  }
};

// Search logs
export const searchLogs = async (searchTerm) => {
  const db = getDatabase();
  try {
    const result = await db.getAllAsync(`
      SELECT * FROM logs
      WHERE action LIKE ? OR table_name LIKE ? OR details LIKE ?
      ORDER BY timestamp DESC
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
    return result;
  } catch (error) {
    console.error('Error searching logs:', error);
    throw error;
  }
};

// Delete old logs (older than N days)
export const deleteOldLogs = async (days = 90) => {
  const db = getDatabase();
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffISO = cutoffDate.toISOString();
    
    await db.runAsync(`
      DELETE FROM logs
      WHERE timestamp < ?
    `, [cutoffISO]);
    
    return true;
  } catch (error) {
    console.error('Error deleting old logs:', error);
    throw error;
  }
};

// Clear all logs
export const clearAllLogs = async () => {
  const db = getDatabase();
  try {
    await db.runAsync('DELETE FROM logs');
    return true;
  } catch (error) {
    console.error('Error clearing all logs:', error);
    throw error;
  }
};

// Get log statistics
export const getLogStatistics = async () => {
  const db = getDatabase();
  try {
    const total = await db.getFirstAsync('SELECT COUNT(*) as count FROM logs');
    
    const byAction = await db.getAllAsync(`
      SELECT action, COUNT(*) as count
      FROM logs
      GROUP BY action
      ORDER BY count DESC
    `);
    
    const byTable = await db.getAllAsync(`
      SELECT table_name, COUNT(*) as count
      FROM logs
      GROUP BY table_name
      ORDER BY count DESC
    `);
    
    const recentActivity = await db.getAllAsync(`
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM logs
      WHERE timestamp >= datetime('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);
    
    return {
      total: total.count,
      byAction,
      byTable,
      recentActivity,
    };
  } catch (error) {
    console.error('Error getting log statistics:', error);
    throw error;
  }
};

export default {
  logAction,
  getAllLogs,
  getLogsPaginated,
  getLogsByTable,
  getLogsByAction,
  getLogsByDateRange,
  getLogsByRecord,
  searchLogs,
  deleteOldLogs,
  clearAllLogs,
  getLogStatistics,
};