import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, LayoutAnimation, UIManager, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, PackageOpen, CheckCircle, AlertCircle, Activity } from 'lucide-react-native';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { getParcels, Parcel } from '../storage/parcelStorage';
import { checkAndArchive } from '../storage/historyStorage';
import { getProfile } from '../storage/profileStorage';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const DashboardScreen = ({ navigation }: any) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [userName, setUserName] = useState('Driver');

  useFocusEffect(useCallback(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        const profile = await getProfile();
        await checkAndArchive();
        const loadedParcels = await getParcels();

        if (isActive) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setUserName(profile.name.split(' ')[0] || 'Driver');
          setParcels(loadedParcels);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };

    loadData();

    return () => { isActive = false; };
  }, []));

  const active = parcels.filter(p => p.status === 'Pending' || p.status === 'In Transit').length;
  const delivered = parcels.filter(p => p.status === 'Delivered').length;
  const returned = parcels.filter(p => p.status === 'Returned').length;
  const total = parcels.length;
  
  const deliveryRatio = total > 0 ? delivered / total : 0;
  const progressPercent = `${Math.round(deliveryRatio * 100)}%`;

  const todayDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Typography variant="bodyLg" color={theme.colors.onSurfaceVariant}>Good morning,</Typography>
          <Typography variant="headlineLg">{userName}!</Typography>
          <Typography variant="labelMd" color={theme.colors.primary} style={styles.dateText}>
            {todayDate}
          </Typography>
        </View>

        {/* Quick Action */}
        <Button 
          title="Scan New Parcel" 
          variant="primary"
          icon={<Plus color={theme.colors.onPrimaryContainer} size={20} />} 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AddParcel', { parcel: undefined })}
        />

        {/* Today's Summary Card */}
        <Typography variant="titleLg" style={styles.sectionTitle}>Today's Summary</Typography>
        
        <Card style={styles.summaryCard}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Activity color={theme.colors.secondary} size={20} style={styles.metricIcon} />
              <Typography variant="headlineMd" style={styles.metricValue}>{active}</Typography>
              <Typography variant="labelSm" color={theme.colors.onSurfaceVariant}>ACTIVE</Typography>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <CheckCircle color={theme.colors.tertiary} size={20} style={styles.metricIcon} />
              <Typography variant="headlineMd" style={styles.metricValue}>{delivered}</Typography>
              <Typography variant="labelSm" color={theme.colors.onSurfaceVariant}>DELIVERED</Typography>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <AlertCircle color={theme.colors.error} size={20} style={styles.metricIcon} />
              <Typography variant="headlineMd" style={styles.metricValue}>{returned}</Typography>
              <Typography variant="labelSm" color={theme.colors.onSurfaceVariant}>RETURNED</Typography>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Typography variant="labelMd" color={theme.colors.onSurfaceVariant}>Delivery Progress</Typography>
              <Typography variant="labelMd" color={theme.colors.onSurfaceVariant}>{progressPercent}</Typography>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: progressPercent }]} />
            </View>
          </View>
        </Card>

        {/* Empty State Illustration */}
        {active === 0 && (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconCircle}>
              <PackageOpen color={theme.colors.primary} size={48} />
            </View>
            <Typography variant="titleLg" style={styles.emptyTitle}>All Caught Up!</Typography>
            <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant} style={styles.emptyText}>
              You have no active parcels remaining for today. Great job!
            </Typography>
          </View>
        )}

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
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  dateText: {
    marginTop: 4,
    textTransform: 'uppercase',
  },
  quickActionButton: {
    marginBottom: theme.spacing.xl,
    paddingVertical: 14,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.outlineVariant,
  },
  metricIcon: {
    marginBottom: theme.spacing.xs,
  },
  metricValue: {
    marginBottom: 2,
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.tertiary,
    borderRadius: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.onSurface,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
});
