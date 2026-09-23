import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, Save, Trash2 } from 'lucide-react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { theme } from '../theme';
import {
  Parcel, ParcelStatus, saveParcel, deleteParcel, generateId,
} from '../storage/parcelStorage';

const STATUSES: ParcelStatus[] = ['Pending', 'In Transit', 'Delivered', 'Returned'];

const STATUS_COLORS: Record<ParcelStatus, string> = {
  Pending: theme.colors.error,
  'In Transit': theme.colors.secondary,
  Delivered: theme.colors.tertiary,
  Returned: theme.colors.onSurfaceVariant,
};

interface Props {
  route?: { params?: { parcel?: Parcel } };
  navigation?: any;
}

export const AddParcelScreen = ({ route, navigation }: Props) => {
  const existing = route?.params?.parcel;

  const [trackingId,   setTrackingId]   = useState(existing?.trackingId ?? '');
  const [customerName, setCustomerName] = useState(existing?.customerName ?? '');
  const [mobileNumber, setMobileNumber] = useState(existing?.mobileNumber ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [status, setStatus] = useState<ParcelStatus>(existing?.status ?? 'Pending');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photoUri ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTrackingId(existing?.trackingId ?? '');
    setCustomerName(existing?.customerName ?? '');
    setMobileNumber(existing?.mobileNumber ?? '');
    setAddress(existing?.address ?? '');
    setStatus(existing?.status ?? 'Pending');
    setNotes(existing?.notes ?? '');
    setPhotoUri(existing?.photoUri ?? null);
  }, [existing]);

  const pickImage = async () => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!customerName.trim()) { Alert.alert('Required', 'Customer name is required.'); return; }
    if (!address.trim()) { Alert.alert('Required', 'Address is required.'); return; }
    setSaving(true);
    try {
      const parcel: Parcel = {
        id: existing?.id ?? generateId(),
        trackingId:   trackingId.trim(),
        customerName: customerName.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        status,
        notes: notes.trim(),
        photoUri,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      await saveParcel(parcel);
      setSaving(false);
      navigation?.goBack();
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error Saving', err?.message || 'Unknown error occurred while saving.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Parcel', 'Are you sure you want to delete this parcel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteParcel(existing!.id);
          navigation?.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <X color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>
        <Typography variant="titleLg">{existing ? 'Edit Parcel' : 'Add Parcel'}</Typography>
        {existing ? (
          <TouchableOpacity onPress={handleDelete}>
            <Trash2 color={theme.colors.error} size={24} />
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Photo */}
        <Card style={styles.photoCard}>
          {photoUri ? (
            <View>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                <X color={theme.colors.onSurface} size={16} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera color={theme.colors.onSurfaceVariant} size={40} />
              <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant} style={styles.photoText}>
                Add parcel photo
              </Typography>
              <View style={styles.photoButtons}>
                <Button title="Camera" variant="outline" size="sm" onPress={takePhoto} style={styles.photoBtn} />
                <Button title="Gallery" variant="outline" size="sm" onPress={pickImage} style={styles.photoBtn} />
              </View>
            </View>
          )}
        </Card>

        {/* Fields */}
        <Field label="TRACKING ID" value={trackingId} onChange={setTrackingId} placeholder="e.g. #TRK-88902-XYZ" />
        <Field label="CUSTOMER NAME *" value={customerName} onChange={setCustomerName} placeholder="e.g. Sarah Jenkins" />
        <Field label="MOBILE NUMBER" value={mobileNumber} onChange={setMobileNumber} placeholder="e.g. +1 555-0123" keyboardType="phone-pad" />
        <Field label="ADDRESS *" value={address} onChange={setAddress} placeholder="e.g. 1242 Cyberpunk Dr, Suite 404" multiline />
        <Field label="NOTES" value={notes} onChange={setNotes} placeholder="Special delivery instructions..." multiline />

        {/* Status */}
        <Typography variant="labelMd" color={theme.colors.onSurfaceVariant} style={styles.fieldLabel}>STATUS</Typography>
        <View style={styles.statusRow}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusChip, { borderColor: STATUS_COLORS[s], backgroundColor: status === s ? STATUS_COLORS[s] + '33' : 'transparent' }]}
              onPress={() => setStatus(s)}
            >
              <Typography variant="labelMd" color={STATUS_COLORS[s]}>{s}</Typography>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={existing ? 'Save Changes' : 'Add Parcel'}
          variant="primary"
          loading={saving}
          onPress={handleSave}
          icon={<Save color={theme.colors.onPrimaryContainer} size={18} />}
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const Field = ({
  label, value, onChange, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any;
}) => (
  <View style={styles.fieldContainer}>
    <Typography variant="labelMd" color={theme.colors.onSurfaceVariant} style={styles.fieldLabel}>{label}</Typography>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      multiline={multiline}
      keyboardType={keyboardType}
      style={[styles.input, multiline && styles.inputMultiline]}
    />
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant,
  },
  container: { padding: theme.spacing.lg, paddingBottom: 40 },
  photoCard: { marginBottom: theme.spacing.lg, padding: 0, overflow: 'hidden' },
  photo: { width: '100%', height: 200, borderRadius: theme.rounded.xl },
  removePhoto: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4,
  },
  photoPlaceholder: { alignItems: 'center', padding: theme.spacing.xl },
  photoText: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
  photoButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  photoBtn: { minWidth: 100 },
  fieldContainer: { marginBottom: theme.spacing.md },
  fieldLabel: { marginBottom: theme.spacing.xs },
  input: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.rounded.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    color: theme.colors.onSurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  statusChip: { borderWidth: 1, borderRadius: theme.rounded.full, paddingHorizontal: theme.spacing.md, paddingVertical: 6 },
  saveButton: { marginTop: theme.spacing.sm },
});
