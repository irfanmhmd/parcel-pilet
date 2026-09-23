import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView,
  Image, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Phone, CheckCircle, UserX, Edit3, Package } from 'lucide-react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { theme } from '../theme';
import { Parcel, ParcelStatus, saveParcel, getParcels } from '../storage/parcelStorage';
import { incrementCallCount } from '../storage/historyStorage';

const STATUS_COLORS: Record<ParcelStatus, string> = {
  Pending:      theme.colors.error,
  'In Transit': theme.colors.secondary,
  Delivered:    theme.colors.tertiary,
  Returned:     theme.colors.onSurfaceVariant,
};

interface Props {
  route: { params: { parcel: Parcel } };
  navigation: any;
}

export const ParcelDetailsScreen = ({ route, navigation }: any) => {
  const [parcel, setParcel] = useState<Parcel>(route.params.parcel);

  useFocusEffect(
    useCallback(() => {
      getParcels().then(parcels => {
        const found = parcels.find(p => p.id === parcel.id);
        if (found) {
          setParcel(found);
        }
      });
    }, [parcel.id])
  );

  const updateStatus = async (status: ParcelStatus) => {
    const updated = { ...parcel, status };
    await saveParcel(updated);
    setParcel(updated);
  };

  const handleCall = () => {
    if (!parcel.mobileNumber) { Alert.alert('No number', 'No mobile number saved for this parcel.'); return; }
    incrementCallCount();
    Linking.openURL(`tel:${parcel.mobileNumber}`);
  };

  const handleMarkDelivered = () => {
    Alert.alert('Mark as Delivered?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delivered', onPress: () => updateStatus('Delivered') },
    ]);
  };

  const handleUnavailable = () => {
    Alert.alert('Customer Unavailable?', 'Mark this parcel as Returned?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Returned', style: 'destructive', onPress: () => updateStatus('Returned') },
    ]);
  };

  const statusColor = STATUS_COLORS[parcel.status] ?? theme.colors.onSurfaceVariant;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={theme.colors.onSurface} size={26} />
        </TouchableOpacity>
        <Typography variant="titleLg">Parcel Details</Typography>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('AddParcel', { parcel })}
        >
          <Edit3 color={theme.colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        {parcel.photoUri ? (
          <Image source={{ uri: parcel.photoUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Package color={theme.colors.onSurfaceVariant} size={48} />
            <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant} style={{ marginTop: 8 }}>
              No photo
            </Typography>
          </View>
        )}

        <View style={styles.content}>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Typography variant="labelLg" color={statusColor}>{parcel.status.toUpperCase()}</Typography>
          </View>

          {/* Info card */}
          <Card style={styles.infoCard}>
            <InfoRow label="TRACKING ID"   value={parcel.trackingId || '—'} accent="#4FC3F7" />
            <InfoRow label="CUSTOMER"      value={parcel.customerName}       accent="#A5D6A7" />
            <InfoRow label="MOBILE"        value={parcel.mobileNumber || '—'} accent="#FFD54F" />
            <InfoRow label="ADDRESS"       value={parcel.address}            accent="#CE93D8" />
            {parcel.notes ? <InfoRow label="NOTES" value={parcel.notes} accent={theme.colors.outline} /> : null}
            <InfoRow label="PARCEL ID"     value={parcel.id}                 accent={theme.colors.outlineVariant} />
            <InfoRow
              label="SCANNED"
              value={new Date(parcel.createdAt).toLocaleString()}
              accent={theme.colors.outlineVariant}
              last
            />
          </Card>

          {/* Action buttons */}
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Phone color="#fff" size={20} />
            <Typography variant="labelLg" color="#fff" style={{ marginLeft: 8 }}>
              Call {parcel.mobileNumber || 'Customer'}
            </Typography>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <Button
              title="Mark Delivered"
              variant="primary"
              icon={<CheckCircle color={theme.colors.onPrimaryContainer} size={18} />}
              onPress={handleMarkDelivered}
              disabled={parcel.status === 'Delivered'}
              style={styles.actionBtn}
            />
            <Button
              title="Unavailable"
              variant="outline"
              icon={<UserX color={parcel.status === 'Returned' ? theme.colors.onSurfaceVariant : theme.colors.error} size={18} />}
              onPress={handleUnavailable}
              disabled={parcel.status === 'Returned'}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value, accent, last }: { label: string; value: string; accent: string; last?: boolean }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <View style={[styles.infoAccent, { backgroundColor: accent }]} />
    <View style={styles.infoBody}>
      <Typography variant="labelMd" color={theme.colors.onSurfaceVariant}>{label}</Typography>
      <Typography variant="bodyMd" color={theme.colors.onSurface}>{value}</Typography>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  editBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

  image:            { width: '100%', height: 260 },
  imagePlaceholder: {
    width: '100%', height: 180,
    backgroundColor: theme.colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center',
  },

  content:     { padding: theme.spacing.lg, paddingBottom: 48 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: theme.rounded.full,
    paddingHorizontal: theme.spacing.md, paddingVertical: 6,
    marginBottom: theme.spacing.lg,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: theme.spacing.xs },

  infoCard: { marginBottom: theme.spacing.lg, padding: 0, overflow: 'hidden' },
  infoRow:  { flexDirection: 'row', padding: theme.spacing.md },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant },
  infoAccent: { width: 3, borderRadius: 2, marginRight: theme.spacing.sm },
  infoBody: { flex: 1, gap: 2 },

  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2E7D32', borderRadius: theme.rounded.full,
    paddingVertical: 14, marginBottom: theme.spacing.md,
  },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm },
  actionBtn: { flex: 1 },
});
