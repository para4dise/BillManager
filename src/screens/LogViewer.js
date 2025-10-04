/**
 * File: src/screens/LogViewer.js
 * Description: Activity log viewer with filtering and export capabilities
 * Version: 1.0.0
 * Last Updated: 2025-10-04
 * Changes: Initial version - view and filter application logs
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { getAllLogs, clearLogs } from '../database/logs';
import { formatDateTime } from '../utils/dateUtils';

const LogViewer = ({ navigation }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, CREATE, UPDATE, DELETE

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [filter])
  );

  const loadLogs = async () => {
    try {
      setLoading(true);
      const allLogs = await getAllLogs();
      
      // Apply filter
      let filteredLogs = allLogs;
      if (filter !== 'all') {
        filteredLogs = allLogs.filter(log => log.action === filter);
      }
      
      setLogs(filteredLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
      Alert.alert(t('common.error'), 'Failed to load logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to delete all logs? This action cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearLogs();
              await loadLogs();
              Alert.alert(t('common.success'), 'All logs cleared');
            } catch (error) {
              console.error('Error clearing logs:', error);
              Alert.alert(t('common.error'), 'Failed to clear logs');
            }
          },
        },
      ]
    );
  };

  const handleLogPress = (log) => {
    let detailsText = 'No details available';
    if (log.details) {
      try {
        const details = JSON.parse(log.details);
        detailsText = JSON.stringify(details, null, 2);
      } catch (e) {
        detailsText = log.details;
      }
    }

    Alert.alert(
      `${log.action} - ${log.table_name || 'N/A'}`,
      `ID: ${log.record_id || 'N/A'}\nTime: ${formatDateTime(log.timestamp)}\n\nDetails:\n${detailsText}`,
      [{ text: t('common.confirm') }]
    );
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return COLORS.success;
      case 'UPDATE': return COLORS.primary;
      case 'DELETE': return COLORS.error;
      case 'REGENERATE_PAYMENTS':
      case 'GENERATE_PAYMENTS':
      case 'AUTO_GENERATE_MISSING':
        return COLORS.warning;
      default: return COLORS.text.secondary;
    }
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'CREATE' && styles.filterButtonActive]}
        onPress={() => setFilter('CREATE')}
      >
        <Text style={[styles.filterButtonText, filter === 'CREATE' && styles.filterButtonTextActive]}>
          Create
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'UPDATE' && styles.filterButtonActive]}
        onPress={() => setFilter('UPDATE')}
      >
        <Text style={[styles.filterButtonText, filter === 'UPDATE' && styles.filterButtonTextActive]}>
          Update
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'DELETE' && styles.filterButtonActive]}
        onPress={() => setFilter('DELETE')}
      >
        <Text style={[styles.filterButtonText, filter === 'DELETE' && styles.filterButtonTextActive]}>
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Activity Logs ({logs.length})</Text>
      <TouchableOpacity style={styles.clearButton} onPress={handleClearLogs}>
        <Text style={styles.clearButtonText}>Clear All</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLogItem = ({ item }) => (
    <TouchableOpacity
      style={styles.logItem}
      onPress={() => handleLogPress(item)}
    >
      <View style={styles.logHeader}>
        <Text style={[styles.logAction, { color: getActionColor(item.action) }]}>
          {item.action}
        </Text>
        <Text style={styles.logTime}>
          {formatDateTime(item.timestamp, 'MMM d, HH:mm')}
        </Text>
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTable}>{item.table_name || 'N/A'}</Text>
        {item.record_id && (
          <Text style={styles.logRecordId}>ID: {item.record_id}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderFilterButtons()}
      {logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No logs available</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  clearButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearButtonText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  filterButtonTextActive: {
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  logItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logAction: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  logBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTable: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  logRecordId: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});

export default LogViewer;