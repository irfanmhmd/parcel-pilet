import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2, User, Moon, Edit2, Check, PackageCheck, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { theme } from '../theme';
import { getParcels, Parcel } from '../storage/parcelStorage';
import { getHistory, DaySummary, clearHistory, clearTodayParcels } from '../storage/historyStorage';
import { getProfile, saveProfile, UserProfile } from '../storage/profileStorage';

export const ProfileScreen = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [history, setHistory] = useState<DaySummary[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: 'Alex Driver', photoUri: null });
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  const loadData = useCallback(() => {
    getParcels().then(setParcels);
    getHistory().then(setHistory);
    getProfile().then(p => {
      setProfile(p);
      setEditNameValue(p.name);
    });
  }, []);

  useFocusEffect(loadData);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newProfile = { ...profile, photoUri: result.assets[0].uri };
      setProfile(newProfile);
      await saveProfile(newProfile);
    }
  };

  const handleSaveName = async () => {
    const newName = editNameValue.trim() || 'Driver';
    const newProfile = { ...profile, name: newName };
    setProfile(newProfile);
    setEditNameValue(newName);
    setIsEditingName(false);
    await saveProfile(newProfile);
  };

  // Stats Calculation
  const todayDelivered = parcels.filter(p => p.status === 'Delivered').length;
  const todayReturned = parcels.filter(p => p.status === 'Returned').length;

  const historyDelivered = history.reduce((sum, day) => sum + day.delivered, 0);
  const historyReturned = history.reduce((sum, day) => sum + day.returned, 0);

  const totalDelivered = todayDelivered + historyDelivered;
  const totalReturned = todayReturned + historyReturned;

  const handleClearToday = () => {
    Alert.alert('Clear Today\'s Data', 'Are you sure you want to delete all active parcels for today? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Clear Data', 
        style: 'destructive',
        onPress: async () => {
          await clearTodayParcels();
          loadData();
        }
      }
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to delete all archived daily history? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Clear History', 
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          loadData();
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        {/* Header Profile Info */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {profile.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <User color={theme.colors.onPrimaryContainer} size={40} />
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Edit2 color={theme.colors.onPrimary} size={14} />
            </View>
          </TouchableOpacity>

          <View style={styles.nameContainer}>
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  autoFocus
                  onSubmitEditing={handleSaveName}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName}>
                  <Check color={theme.colors.primary} size={24} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Typography variant="headlineLg" style={styles.name}>{profile.name}</Typography>
                <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editNameBtn}>
                  <Edit2 color={theme.colors.onSurfaceVariant} size={18} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant}>ID: PL-98324</Typography>
        </View>

        {/* Stats Grid */}
        <Typography variant="titleLg" style={styles.sectionTitle}>Overall Statistics</Typography>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <PackageCheck color={theme.colors.tertiary} size={24} />
            <Typography variant="headlineLg" style={styles.statNumber}>{totalDelivered}</Typography>
            <Typography variant="labelSm" color={theme.colors.onSurfaceVariant}>DELIVERED PARCELS</Typography>
          </Card>
          <Card style={styles.statCard}>
            <AlertCircle color={theme.colors.error} size={24} />
            <Typography variant="headlineLg" style={styles.statNumber}>{totalReturned}</Typography>
            <Typography variant="labelSm" color={theme.colors.onSurfaceVariant}>RETURNED PARCELS</Typography>
          </Card>
        </View>

        {/* Settings & Actions */}
        <Typography variant="titleLg" style={styles.sectionTitle}>Settings</Typography>
        
        <Card style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Moon color={theme.colors.onSurface} size={20} />
              </View>
              <Typography variant="bodyLg" style={styles.settingText}>Dark Mode</Typography>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
              thumbColor={isDarkMode ? theme.colors.onPrimary : '#f4f3f4'}
            />
          </View>
        </Card>

        <Typography variant="titleLg" style={styles.sectionTitle}>Data Management</Typography>
        
        <Card style={styles.settingsCard}>
          <TouchableOpacity style={[styles.settingItem, styles.settingItemBorder]} onPress={handleClearToday}>
            <View style={styles.settingRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.errorContainer }]}>
                <Trash2 color={theme.colors.error} size={20} />
              </View>
              <Typography variant="bodyLg" color={theme.colors.error} style={styles.settingText}>Clear Today's Active Data</Typography>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleClearHistory}>
            <View style={styles.settingRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.errorContainer }]}>
                <Trash2 color={theme.colors.error} size={20} />
              </View>
              <Typography variant="bodyLg" color={theme.colors.error} style={styles.settingText}>Clear 7-Day History</Typography>
            </View>
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    marginRight: 8,
  },
  editNameBtn: {
    padding: 4,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 2,
    minWidth: 150,
    textAlign: 'center',
  },
  saveNameBtn: {
    marginLeft: 8,
    padding: 4,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'flex-start',
    marginHorizontal: 4,
  },
  statNumber: {
    marginTop: theme.spacing.sm,
    marginBottom: 2,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingText: {
    fontWeight: '500',
  },
});
