import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { AppScreen, BodyText, BrandMark, Button, Heading } from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { useSession } from '@/context/session';
import { deleteAccount } from '@/services/api';

export default function ProfileScreen() {
  const { profile, session, signOut } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const logout = async () => { await signOut(); router.replace('/sign-in'); };
  const removeAccount = async () => {
    if (deleting) return;
    setDeleting(true); setError('');
    try { await deleteAccount(); await signOut(); setConfirmDelete(false); router.replace('/sign-in'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete this account. Please try again.'); }
    finally { setDeleting(false); }
  };

  return (
    <AppScreen contentStyle={styles.page}>
      <BrandMark size={48} />
      <Heading>Your profile</Heading>
      <BodyText>Your learning setup, kept simple.</BodyText>
      <View style={styles.card}>
        <Text style={styles.label}>LEARNER</Text><Text style={styles.value}>{profile?.name || session?.name}</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>GRADE</Text><Text style={styles.value}>{profile?.grade || 'Not set'}</Text>
        {profile?.curriculum ? <><View style={styles.divider} /><Text style={styles.label}>CURRICULUM</Text><Text style={styles.value}>{profile.curriculum}</Text></> : null}
      </View>
      <Button variant="secondary" onPress={() => router.push('/onboarding')}>Update learner details</Button>
      <Button variant="plain" onPress={() => { setError(''); setConfirmDelete(true); }}>Delete account</Button>
      <Button variant="plain" onPress={logout}>Log out</Button>
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.modalShade}><View style={styles.modal}>
          <Heading style={styles.modalTitle}>Delete your account?</Heading>
          <BodyText>This permanently deletes your Kindling account, learner profile, lessons, and saved learning progress. You can’t undo this.</BodyText>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Button busy={deleting} onPress={() => void removeAccount()}>Delete account and learning data</Button>
          <Button variant="plain" disabled={deleting} onPress={() => setConfirmDelete(false)}>Keep my account</Button>
        </View></View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 26, gap: 16 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.line, borderRadius: 20, padding: 18, gap: 7, marginTop: 8 },
  label: { color: Brand.teal, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  value: { color: Brand.ink, fontSize: 17, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Brand.line, marginVertical: 7 },
  modalShade: { flex: 1, backgroundColor: 'rgba(17,31,27,0.48)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: Brand.parchment, borderRadius: 22, padding: 20, gap: 14 },
  modalTitle: { fontSize: 23 },
  error: { color: Brand.error, fontSize: 14, lineHeight: 20 },
});
