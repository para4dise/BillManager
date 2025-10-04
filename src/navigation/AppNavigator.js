/**
 * File: src/navigation/AppNavigator.js
 * Description: Main navigation setup with tabs and stack navigators
 * Version: 1.3.0
 * Last Updated: 2025-10-04
 * Changes: v1.3.0 - Added LogViewer screen to Settings stack
 *          v1.2.0 - Initial version with tabs
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { COLORS } from '../constants/colors';

// Import screens
import PaymentDashboard from '../screens/PaymentDashboard';
import PaymentDetail from '../screens/PaymentDetail';
import AccountList from '../screens/AccountList';
import AccountDetail from '../screens/AccountDetail';
import Settings from '../screens/Settings';
import LogViewer from '../screens/LogViewer';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Payment Stack Navigator
const PaymentStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.text.inverse,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="PaymentDashboardScreen"
        component={PaymentDashboard}
        options={{
          title: 'Payments',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="PaymentDetail"
        component={PaymentDetail}
        options={{
          title: 'Payment Detail',
        }}
      />
    </Stack.Navigator>
  );
};

// Account Stack Navigator
const AccountStack = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.text.inverse,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="AccountListScreen"
        component={AccountList}
        options={{
          title: 'Account List',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AccountDetail"
        component={AccountDetail}
        options={{
          title: 'Account Detail',
        }}
      />
    </Stack.Navigator>
  );
};

// Settings Stack Navigator
const SettingsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.text.inverse,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="SettingsScreen"
        component={Settings}
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="LogViewer"
        component={LogViewer}
        options={{
          title: 'Activity Logs',
        }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[500],
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.text.inverse,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="PaymentDashboard"
        component={PaymentStack}
        options={{
          tabBarLabel: 'Payments',
          title: 'Payments',
          tabBarIcon: ({ color, size }) => {
            return <Text style={{ fontSize: size }}>💳</Text>;
          },
        }}
      />
      <Tab.Screen
        name="AccountList"
        component={AccountStack}
        options={{
          tabBarLabel: 'Accounts',
          title: 'Accounts',
          tabBarIcon: ({ color, size }) => {
            return <Text style={{ fontSize: size }}>📋</Text>;
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
          title: 'Settings',
          tabBarIcon: ({ color, size }) => {
            return <Text style={{ fontSize: size }}>⚙️</Text>;
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;