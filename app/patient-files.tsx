import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import {
  useDeleteDocument,
  usePatientDocuments,
  useUploadDocument,
} from '@/hooks/use-documents';
import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';
import type { PatientDocument, PickedFile } from '@/types/documents';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';
const IMAGE_RE = /\.(webp|jpe?g|png|gif|bmp|tiff?)$/i;
const PDF_RE = /\.pdf$/i;

export default function PatientFilesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string; patientName?: string }>();
  const patientId = params.patientId ? Number(params.patientId) : null;
  const patientName = params.patientName ?? 'Patient';

  const { data, isLoading, isError, refetch, isRefetching } = usePatientDocuments(patientId);
  const upload = useUploadDocument(patientId ?? 0);
  const remove = useDeleteDocument(patientId ?? 0);
  const [preview, setPreview] = useState<PatientDocument | null>(null);

  const files = data ?? [];

  const addFile = () => {
    Alert.alert('Add file', 'Choose a source', [
      { text: 'Take photo', onPress: () => pickAndUpload('camera') },
      { text: 'Photo library', onPress: () => pickAndUpload('library') },
      { text: 'Browse files', onPress: () => pickAndUpload('file') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickAndUpload = async (source: 'camera' | 'library' | 'file') => {
    try {
      let picked: PickedFile | null = null;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
        if (res.canceled) return;
        picked = normalizeImageAsset(res.assets[0]);
      } else if (source === 'library') {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
        });
        if (res.canceled) return;
        picked = normalizeImageAsset(res.assets[0]);
      } else {
        const res = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (res.canceled) return;
        picked = normalizeDocAsset(res.assets[0]);
      }
      if (!picked) return;
      await upload.mutateAsync(picked);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const openFile = (doc: PatientDocument) => {
    if (IMAGE_RE.test(doc.fileName)) {
      setPreview(doc);
    } else {
      // PDFs, video and anything else open in the device's own viewer via the
      // presigned URL.
      Linking.openURL(doc.url).catch(() =>
        Alert.alert('Could not open', 'No app is available to open this file.'),
      );
    }
  };

  const confirmDelete = (doc: PatientDocument) => {
    if (!doc.fileName) return;
    Alert.alert('Delete file', `Delete “${doc.fileName}”? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(doc.fileName);
          } catch (err) {
            Alert.alert('Delete failed', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  if (patientId == null) {
    return (
      <Screen contentContainerStyle={styles.center} edges={['top']}>
        <Text style={styles.errorText}>No patient selected.</Text>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/register'))}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={ms(20)} color={HEADING_COLOR} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Patient Files</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {patientName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add file"
          onPress={addFile}
          disabled={upload.isPending}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
          {upload.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="add" size={ms(24)} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn’t load files.</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(d, i) => (d.id != null ? String(d.id) : `${d.fileName}-${i}`)}
          renderItem={({ item }) => (
            <FileRow doc={item} onOpen={() => openFile(item)} onDelete={() => confirmDelete(item)} />
          )}
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Ionicons name="folder-open-outline" size={ms(40)} color={colors.primary[500]} />
              </View>
              <Text style={styles.emptyText}>No files yet. Tap + to add an X-ray or document.</Text>
            </View>
          }
        />
      )}

      {/* Full-screen image preview (X-rays come back as images). */}
      <Modal visible={preview != null} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.viewerBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            onPress={() => setPreview(null)}
            style={styles.viewerClose}>
            <Ionicons name="close" size={ms(26)} color="#FFFFFF" />
          </Pressable>
          {preview ? (
            <Image source={{ uri: preview.url }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

function FileRow({
  doc,
  onOpen,
  onDelete,
}: {
  doc: PatientDocument;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const kind = fileKind(doc.fileName);
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.fileIcon, { backgroundColor: kind.bg }]}>
        <Ionicons name={kind.icon} size={ms(20)} color={kind.color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.fileName} numberOfLines={1}>
          {doc.fileName}
        </Text>
        <Text style={styles.fileMeta} numberOfLines={1}>
          {kind.label}
          {doc.createdAt ? ` · ${doc.createdAt}` : ''}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete file"
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}>
        <Ionicons name="trash-outline" size={ms(18)} color={colors.danger[500]} />
      </Pressable>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function fileKind(name: string): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
} {
  if (IMAGE_RE.test(name)) return { label: 'Image', icon: 'image-outline', color: colors.primary[500], bg: '#EFF6FF' };
  if (PDF_RE.test(name)) return { label: 'PDF', icon: 'document-text-outline', color: colors.danger[500], bg: colors.danger[10] };
  if (/\.mp4$/i.test(name)) return { label: 'Video', icon: 'videocam-outline', color: '#7C3AED', bg: '#F3E8FF' };
  return { label: 'File', icon: 'document-outline', color: SUBTITLE_COLOR, bg: '#F1F5F9' };
}

function normalizeImageAsset(a: ImagePicker.ImagePickerAsset): PickedFile {
  const name = a.fileName ?? `photo_${Date.now()}.jpg`;
  return {
    uri: a.uri,
    name,
    mimeType: a.mimeType ?? 'image/jpeg',
    size: a.fileSize ?? 0,
  };
}

function normalizeDocAsset(a: DocumentPicker.DocumentPickerAsset): PickedFile {
  return {
    uri: a.uri,
    name: a.name ?? `file_${Date.now()}`,
    mimeType: a.mimeType ?? 'application/octet-stream',
    size: a.size ?? 0,
  };
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
    paddingBottom: 0,
  },
  flex: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
  addBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
  },
  pressed: { opacity: 0.6 },
  headerText: { flex: 1, gap: spacing.xs },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(22),
    lineHeight: ms(28),
    color: HEADING_COLOR,
  },
  subtitle: { ...typography.body.medium, fontSize: ms(14), color: SUBTITLE_COLOR },
  center: { paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.md, flexGrow: 1, justifyContent: 'center' },
  emptyIcon: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { ...typography.body.medium, color: SUBTITLE_COLOR, textAlign: 'center', maxWidth: s(280) },
  errorText: { ...typography.body.large, color: colors.danger[500], textAlign: 'center' },
  retryText: { ...typography.label.large, color: colors.primary[500] },
  separator: { height: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  rowPressed: { opacity: 0.7 },
  fileIcon: {
    width: s(44),
    height: s(44),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  fileName: { ...typography.body.medium, fontFamily: 'Inter_600SemiBold', color: HEADING_COLOR },
  fileMeta: { ...typography.body.small, color: SUBTITLE_COLOR },
  deleteBtn: {
    width: s(36),
    height: s(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '82%' },
  viewerClose: {
    position: 'absolute',
    top: s(48),
    right: s(20),
    zIndex: 2,
    width: s(44),
    height: s(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
