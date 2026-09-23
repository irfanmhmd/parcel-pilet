import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Package, ScanLine, History, User } from 'lucide-react-native';
import { View } from 'react-native';

import { DashboardScreen }    from '../screens/DashboardScreen';
import { ParcelListScreen }   from '../screens/ParcelListScreen';
import { ScannerScreen }      from '../screens/ScannerScreen';
import { HistoryScreen }      from '../screens/HistoryScreen';
import { ProfileScreen }      from '../screens/ProfileScreen';
import { AddParcelScreen }    from '../screens/AddParcelScreen';
import { ScanReviewScreen }   from '../screens/ScanReviewScreen';
import { ParcelDetailsScreen } from '../screens/ParcelDetailsScreen';
import { theme } from '../theme';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.colors.surfaceContainerHighest,
        borderTopWidth: 0,
        elevation: 0,
        height: 60,
        paddingBottom: 8,
      },
      tabBarActiveTintColor:   theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
    }}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen}
      options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />

    <Tab.Screen name="Packages" component={ParcelListScreen}
      options={{ tabBarIcon: ({ color, size }) => <Package color={color} size={size} /> }} />

    <Tab.Screen name="Scanner" component={ScannerScreen}
      options={{
        tabBarIcon: ({ size }) => (
          <View style={{
            backgroundColor: theme.colors.primaryContainer,
            padding: 12, borderRadius: 24, marginBottom: 20,
          }}>
            <ScanLine color={theme.colors.onPrimaryContainer} size={size + 4} />
          </View>
        ),
        tabBarLabel: () => null,
      }}
    />

    <Tab.Screen name="History" component={HistoryScreen}
      options={{ tabBarIcon: ({ color, size }) => <History color={color} size={size} /> }} />

    <Tab.Screen name="Profile" component={ProfileScreen}
      options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"          component={TabNavigator} />
      <Stack.Screen name="AddParcel"     component={AddParcelScreen}     options={{ presentation: 'modal' }} />
      <Stack.Screen name="ScanReview"    component={ScanReviewScreen}    options={{ presentation: 'modal' }} />
      <Stack.Screen name="ParcelDetails" component={ParcelDetailsScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);
