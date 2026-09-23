import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView,
  Image, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide-react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { saveParcel, generateId, Parcel } from '../storage/parcelStorage';

interface Extracted {
  trackingId: string;
  customerName: string;
  mobileNumber: string;
  address: string;
}

interface Props {
  route: { params: { photoUri: string | null; extracted: Extracted } };
  navigation: any;
}

export const ScanReviewScreen = ({ route, navigation }: any) => {
  const { photoUri, extracted } = route.params;

  const [trackingId,   setTrackingId]   = useState(extracted.trackingId);
  const [customerName, setCustomerName] = useState(extracted.customerName);
  const [mobileNumber, setMobileNumber] = useState(extracted.mobileNumber);
  const [address,      setAddress]      = useState(extracted.address);
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);

  const handleSave = async () => {
    if (!customerName.trim()) { Alert.alert('Required', 'Customer name is required.'); return; }
    if (!address.trim())      { Alert.alert('Required', 'Address is required.');       return; }
    setSaving(true);
    try {
      const parcel: Parcel = {
        id:           generateId(),
        trackingId:   trackingId.trim(),
        customerName: customerName.trim(),
        mobileNumber: mobileNumber.trim(),
        address:      address.trim(),
        status:       'Pending',
        notes:        notes.trim(),
        photoUri,
        createdAt:    new Date().toISOString(),
      };
      await saveParcel(parcel);
      setSaving(false);
      navigation.goBack(); // Close the modal
      navigation.navigate('Main', { screen: 'Packages' }); // Switch to the packages list
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error Saving', err?.message || 'Unknown error occurred while saving.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={theme.colors.onSurface} size={26} />
        </TouchableOpacity>
        <Typography variant="titleLg">Review Scan</Typography>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Captured image */}
        <View style={styles.imageWrapper}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Typography variant="bodyMd" color={theme.colors.onSurfaceVariant}>No image captured</Typography>
            </View>
          )}
          <View style={styles.scannedBadge}>
            <Check color="#fff" size={12} />
            <Typography variant="labelMd" color="#fff" style={{ marginLeft: 4 }}>Scanned</Typography>
          </View>
        </View>

        {/* Extracted fields */}
        <View style={styles.section}>
          <Typography variant="labelMd" color={theme.colors.primary} style={styles.sectionLabel}>
            EXTRACTED DATA — tap any field to edit
          </Typography>
          {(!extracted.trackingId && !extracted.customerName && !extracted.address) && (
            <View style={styles.noDataBanner}>
              <Typography variant="labelMd" color={theme.colors.error}>
                No fields were auto-detected. Please fill in manually.
              </Typography>
            </View>
          )}

          <Field label="TRACKING ID"   value={trackingId}   onChange={setTrackingId}   color="#4FC3F7" />
          <Field label="CUSTOMER NAME" value={customerName} onChange={setCustomerName} color="#A5D6A7" />
          <Field label="MOBILE NUMBER" value={mobileNumber} onChange={setMobileNumber} color="#FFD54F" keyboardType="phone-pad" />
          <Field label="ADDRESS"       value={address}      onChange={setAddress}      color="#CE93D8" multiline />
          <Field label="NOTES"         value={notes}        onChange={setNotes}        color={theme.colors.onSurfaceVariant} multiline placeholder="Add delivery notes..." />
        </View>

        <Button
          title="Save Parcel"
          variant="primary"
          loading={saving}
          onPress={handleSave}
          icon={<Check color={theme.colors.onPrimaryContainer} size={18} />}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const Field = ({
  label, value, onChange, color, multiline, keyboardType, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  color: string; multiline?: boolean; keyboardType?: any; placeholder?: string;
}) => (
  <View style={styles.fieldRow}>
    <View style={[styles.fieldAccent, { backgroundColor: color }]} />
    <View style={styles.fieldBody}>
      <Typography variant="labelMd" style={[styles.fieldLabel, { color }]}>{label}</Typography>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? '—'}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMulti]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant,
  },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  container:  { padding: theme.spacing.lg, paddingBottom: 48 },

  imageWrapper: { borderRadius: theme.rounded.xl, overflow: 'hidden', marginBottom: theme.spacing.lg, position: 'relative' },
  image:        { width: '100%', height: 220 },
  imagePlaceholder: { backgroundColor: theme.colors.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' },
  scannedBadge: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },

  section:      { marginBottom: theme.spacing.lg },
  sectionLabel: { marginBottom: theme.spacing.md },

  fieldRow:   { flexDirection: 'row', marginBottom: theme.spacing.md },
  fieldAccent: { width: 3, borderRadius: 2, marginRight: theme.spacing.sm, marginTop: 2 },
  fieldBody:  { flex: 1 },
  fieldLabel: { marginBottom: 4, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  input: {
    color: theme.colors.onSurface, fontSize: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.rounded.md, borderWidth: 1, borderColor: theme.colors.outlineVariant,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  noDataBanner: {
    backgroundColor: theme.colors.errorContainer,
    borderRadius: theme.rounded.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  saveBtn:    { marginTop: theme.spacing.sm },
});
