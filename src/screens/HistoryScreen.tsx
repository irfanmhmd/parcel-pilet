import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, PackageCheck, AlertCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { theme } from '../theme';
import { getHistory, DaySummary } from '../storage/historyStorage';

export const HistoryScreen = () => {
  const [history, setHistory] = useState<DaySummary[]>([]);

  useFocusEffect(useCallback(() => {
    getHistory().then(setHistory);
  }, []));

  const totalDelivered = history.reduce((sum, day) => sum + day.delivered, 0);
  const totalReturned = history.reduce((sum, day) => sum + day.returned, 0);

  const renderItem = ({ item }: { item: DaySummary }) => {
    return (
      <Card style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <View style={styles.dateContainer}>
            <CalendarDays color={theme.colors.primary} size={20} />
            <Typography variant="titleLg" style={styles.dateText}>
              {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Typography>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <PackageCheck color={theme.colors.tertiary} size={16} />
            <Typography variant="labelLg" style={styles.statValue}>{item.delivered}</Typography>
            <Typography variant="labelMd" color={theme.colors.onSurfaceVariant}>Delivered</Typography>
          </View>
          <View style={styles.statItem}>
            <AlertCircle color={theme.colors.error} size={16} />
            <Typography variant="labelLg" style={styles.statValue}>{item.returned}</Typography>
            <Typography variant="labelMd" color={theme.colors.onSurfaceVariant}>Returned</Typography>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Typography variant="headlineLg">History</Typography>
        <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant}>Last 7 Days Archive</Typography>
      </View>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Typography variant="headlineLg" color={theme.colors.tertiary}>{totalDelivered}</Typography>
          <Typography variant="labelMd" color={theme.colors.onSurfaceVariant}>DELIVERED</Typography>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Typography variant="headlineLg" color={theme.colors.error}>{totalReturned}</Typography>
          <Typography variant="labelMd" color={theme.colors.onSurfaceVariant}>RETURNED</Typography>
        </View>
      </View>

      <Typography variant="titleLg" style={styles.sectionTitle}>Daily Summary</Typography>

      <FlatList
        data={history}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContainer, history.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CalendarDays color={theme.colors.onSurfaceVariant} size={48} />
            <Typography variant="bodyLg" color={theme.colors.onSurfaceVariant} style={{ marginTop: 16 }}>
              No history yet.
            </Typography>
            <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 8 }}>
              Today's data will appear here automatically tomorrow.
            </Typography>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.rounded.xl,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.outlineVariant,
  },
  sectionTitle: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  listEmpty: {
    flex: 1,
  },
  dayCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    marginTop: 4,
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: 40,
  },
});
