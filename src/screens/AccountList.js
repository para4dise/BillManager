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
import { getAllAccounts, deleteAccount } from '../database/accounts';
import { getCategoryIcon, getCurrencySymbol } from '../constants/categories';

const AccountList = ({ navigation }) => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await getAllAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      Alert.alert(t('common.error'), t('messages.saveError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const handleAddAccount = () => {
    navigation.navigate('AccountDetail');
  };

  const handleEditAccount = (account) => {
    navigation.navigate('AccountDetail', { accountId: account.id });
  };

  const handleDeleteAccount = (account) => {
    Alert.alert(
      t('account.delete'),
      t('account.deleteConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(account.id);
              loadAccounts();
              Alert.alert(t('common.success'), t('messages.deleteSuccess'));
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert(t('common.error'), t('messages.deleteError'));
            }
          },
        },
      ]
    );
  };

  const renderAccountItem = ({ item }) => {
    const icon = getCategoryIcon(item.category);
    const currency = getCurrencySymbol(item.currency);
    const isFixedAmount = item.amount && item.amount > 0;

    return (
      <TouchableOpacity
        style={styles.accountItem}
        onPress={() => handleEditAccount(item)}
        onLongPress={() => handleDeleteAccount(item)}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.topRow}>
            <Text style={styles.category}>{t(`categories.${item.category}`)}</Text>
            {item.bank_account && (
              <Text style={styles.bankAccount}>{item.bank_account}</Text>
            )}
          </View>
          <Text style={styles.accountName}>{item.name}</Text>
          {item.notes && (
            <Text style={styles.notes} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
        
        <View style={styles.amountContainer}>
          {isFixedAmount ? (
            <Text style={styles.amount}>
              {currency}{item.amount.toFixed(2)}
            </Text>
          ) : (
            <Text style={styles.notFixed}>{t('account.notFixed')}</Text>
          )}
          <Text style={styles.repeats}>{t(`repeat.${item.repeats}`)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.addButton} onPress={handleAddAccount}>
        <Text style={styles.addButtonText}>+ {t('account.add')}</Text>
      </TouchableOpacity>
    </View>
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
      {accounts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t('account.noAccounts')}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddAccount}>
            <Text style={styles.emptyButtonText}>{t('account.add')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={accounts}
          renderItem={renderAccountItem}
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
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  accountItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  bankAccount: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  notFixed: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  repeats: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccountList;