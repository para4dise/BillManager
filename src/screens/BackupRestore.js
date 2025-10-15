/**
 * File: src/screens/BackupRestore.js
 * Description: Database backup and restore functionality
 * Version: 1.0.0
 * Last Updated: 2025-10-05
 * Changes: v1.0.0 - Initial implementation with local file backup/restore
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../constants/colors';

const BackupRestore = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const DB_PATH = `${FileSystem.documentDirectory}SQLite/billmanager.db`;

  const createBackup = async () => {
    try {
      setLoading(true);

      const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (!dbInfo.exists) {
        Alert.alert('Error', 'Database file not found');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFilename = `billmanager_backup_${timestamp}.db`;
      const backupPath = `${FileSystem.cacheDirectory}${backupFilename}`;

      await FileSystem.copyAsync({
        from: DB_PATH,
        to: backupPath,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(backupPath, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Save Backup File',
          UTI: 'public.database',
        });
        
        Alert.alert('Success', 'Backup created successfully!');
      } else {
        Alert.alert(
          'Success',
          `Backup created at:\n${backupPath}\n\nYou can find it in your Files app.`
        );
      }

      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(backupPath, { idempotent: true });
        } catch (error) {
          console.log('Error cleaning up backup file:', error);
        }
      }, 5000);
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Error', 'Failed to create backup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async () => {
    try {
      Alert.alert(
        'Warning',
        'Restoring will replace all current data. This action cannot be undone. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: async () => {
              await performRestore();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in restore flow:', error);
    }
  };

  const performRestore = async () => {
    try {
      setLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/octet-stream',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      if (!result.assets[0].name.endsWith('.db')) {
        Alert.alert('Error', 'Please select a valid database file (.db)');
        setLoading(false);
        return;
      }

      const currentBackupPath = `${FileSystem.cacheDirectory}billmanager_before_restore.db`;
      await FileSystem.copyAsync({
        from: DB_PATH,
        to: currentBackupPath,
      });

      await FileSystem.copyAsync({
        from: result.assets[0].uri,
        to: DB_PATH,
      });

      Alert.alert(
        'Success',
        'Database restored successfully!\n\nPlease restart the app for changes to take effect.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error restoring backup:', error);
      Alert.alert(
        'Error',
        'Failed to restore backup: ' + error.message + '\n\nYour original data is still intact.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getDbInfo = async () => {
    try {
      const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (dbInfo.exists) {
        const sizeInMB = (dbInfo.size / (1024 * 1024)).toFixed(2);
        const modifiedDate = new Date(dbInfo.modificationTime * 1000).toLocaleString();
        
        Alert.alert(
          'Database Info',
          `Size: ${sizeInMB} MB\nLast Modified: ${modifiedDate}\n\nPath: ${DB_PATH}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting DB info:', error);
      Alert.alert('Error', 'Failed to get database info');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup</Text>
          <Text style={styles.description}>
            Create a backup of your Bill Manager database. You can save it to Files app, iCloud Drive, or any other location.
          </Text>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={createBackup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Backup</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restore</Text>
          <Text style={styles.description}>
            Restore your database from a previously saved backup file. This will replace all current data.
          </Text>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={restoreBackup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Restore from Backup</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Info</Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={getDbInfo}
          >
            <Text style={styles.infoButtonText}>View Database Info</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Tips</Text>
          <Text style={styles.infoText}>
            • Backup regularly to prevent data loss{'\n'}
            • Store backups in cloud storage (iCloud/Google Drive) for safety{'\n'}
            • Backup files can be transferred between devices{'\n'}
            • Test your backups by restoring on another device
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoButtonText: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 24,
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

export default BackupRestore;