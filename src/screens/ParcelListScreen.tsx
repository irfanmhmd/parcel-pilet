import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList,
  TouchableOpacity, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Phone, Plus, Package, MapPin } from 'lucide-react-native';
import { Typography } from '../components/Typography';
import { theme } from '../theme';
import { getParcels, Parcel, ParcelStatus } from '../storage/parcelStorage';
import { incrementCallCount } from '../storage/historyStorage';

const STATUS_COLORS: Record<ParcelStatus, string> = {
  Pending:      theme.colors.error,
  'In Transit': theme.colors.secondary,
  Delivered:    theme.colors.tertiary,
  Returned:     theme.colors.onSurfaceVariant,
};

export const ParcelListScreen = ({ navigation }: any) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);

  useFocusEffect(useCallback(() => {
    getParcels().then(setParcels);
  }, []));

  const handleCall = (number: string) => {
    incrementCallCount();
    Linking.openURL(`tel:${number}`);
  };

  const renderItem = ({ item }: { item: Parcel }) => {
    const statusColor = STATUS_COLORS[item.status] ?? theme.colors.onSurfaceVariant;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ParcelDetails', { parcel: item })}
      >
        {/* Top row: Thumbnail, Name, status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Package color={theme.colors.onSurfaceVariant} size={20} />
              </View>
            )}
            <View style={styles.customerInfo}>
              <Typography variant="labelLg" style={styles.customerName} numberOfLines={1}>
                {item.customerName}
              </Typography>
              {item.trackingId ? (
                <Typography variant="labelMd" color={theme.colors.onSurfaceVariant} style={styles.trackingId} numberOfLines={1}>
                  ID: {item.trackingId}
                </Typography>
              ) : null}
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Typography variant="labelMd" color={statusColor}>{item.status}</Typography>
          </View>
        </View>

        {/* Middle row: Address */}
        <View style={styles.detailRow}>
          <MapPin color={theme.colors.outline} size={15} style={styles.detailIcon} />
          <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant} style={styles.addressText} numberOfLines={2}>
            {item.address}
          </Typography>
        </View>

        {/* Bottom row: Mobile & Call button */}
        {item.mobileNumber ? (
          <View style={styles.bottomRow}>
            <View style={styles.phoneContainer}>
              <Phone color={theme.colors.primary} size={15} style={styles.detailIcon} />
              <Typography variant="bodyMd" color={theme.colors.onSurface} style={styles.phoneText}>
                {item.mobileNumber}
              </Typography>
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleCall(item.mobileNumber)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Phone color={theme.colors.onPrimaryContainer} size={14} />
              <Typography variant="labelMd" color={theme.colors.onPrimaryContainer} style={styles.callBtnText}>
                Call
              </Typography>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Typography variant="headlineLg">Parcels</Typography>
          <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant}>
            {parcels.length} parcel{parcels.length !== 1 ? 's' : ''}
          </Typography>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddParcel', { parcel: undefined })}>
          <Plus color={theme.colors.onPrimaryContainer} size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={parcels}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, parcels.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Package color={theme.colors.onSurfaceVariant} size={56} />
            <Typography variant="titleLg" color={theme.colors.onSurfaceVariant} style={{ marginTop: 16 }}>
              No parcels yet
            </Typography>
            <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant}>
              Scan a label or tap + to add one
            </Typography>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md,
  },
  addBtn: {
    backgroundColor: theme.colors.primaryContainer,
    padding: theme.spacing.sm, borderRadius: theme.rounded.full,
  },
  list:      { paddingHorizontal: theme.spacing.md, paddingBottom: 100 },
  listEmpty: { flex: 1, paddingHorizontal: 0 },
  separator: { height: theme.spacing.sm },

  card: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.rounded.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: theme.rounded.sm,
    marginRight: theme.spacing.sm,
  },
  thumbPlaceholder: {
    backgroundColor: theme.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  trackingId: {
    marginTop: 2,
    fontSize: 11,
  },
  badge: {
    borderWidth: 1,
    borderRadius: theme.rounded.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 22,
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  detailIcon: {
    marginRight: 6,
    marginTop: 3,
  },
  addressText: {
    flex: 1,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontWeight: '500',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.rounded.full,
  },
  callBtnText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: theme.spacing.xl },
});
