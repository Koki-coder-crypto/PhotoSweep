import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../state/AppContext';
import { Button, Icon } from './components';
import { palette as p, styles as s } from './theme';
import { monthKey, monthLabel } from '../screens/actions';

export function MonthStories({ onSelect, disabled = false }: { onSelect(month: string): void; disabled?: boolean }) {
  const app = useApp(), [all, setAll] = useState(false);
  const months = useMemo(() => {
    const groups = new Map<string, { month: string; uri: string; total: number; reviewed: number }>();
    for (const photo of app.photos) {
      const month = monthKey(photo.createdAt), item = groups.get(month) || { month, uri: photo.uri, total: 0, reviewed: 0 };
      item.total++; if (app.state.decisions[photo.id]) item.reviewed++; groups.set(month, item);
    }
    return [...groups.values()].sort((a, b) => b.month.localeCompare(a.month));
  }, [app.photos, app.state.decisions]);
  const select = (month: string) => { setAll(false); onSelect(month); };
  return <View style={{ gap: 10 }}>
    <View style={s.between}><Text style={s.label}>月を選んでスワイプ</Text><Pressable accessibilityRole="button" onPress={() => setAll(true)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: p.cyan }}>すべての月</Text></Pressable></View>
    <FlatList horizontal data={months} keyExtractor={x => x.month} showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${monthLabel(item.month)}、あと${item.total - item.reviewed}件`} accessibilityState={{ selected: app.state.session?.scope.month === item.month }} disabled={app.busy || disabled}
        onPress={() => select(item.month)} style={{ width: 82, alignItems: 'center', gap: 5 }}>
        <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={72} height={72} style={{ position: 'absolute' }}><Circle cx={36} cy={36} r={33} stroke={p.border} strokeWidth={3} fill="none" /><Circle cx={36} cy={36} r={33} stroke={p.green} strokeWidth={3} fill="none" strokeDasharray={`${207.35 * item.reviewed / item.total} 207.35`} transform="rotate(-90 36 36)" strokeLinecap="round" /></Svg>
          <Image source={{ uri: item.uri }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: app.state.session?.scope.month === item.month ? p.cyan : 'transparent' }} contentFit="cover" />
          {item.total === item.reviewed ? <View style={{ position: 'absolute', right: 0, bottom: 0 }}><Icon name="checkmark-circle" color={p.green} size={24} /></View> : null}
        </View><Text style={s.label}>{Number(item.month.slice(5))}月</Text><Text style={[s.caption, { fontSize: 10 }]}>{item.month.slice(0, 4)}年</Text><Text style={[s.caption, { fontSize: 10 }]}>{item.total === item.reviewed ? '完了' : `あと${item.total - item.reviewed}件`}</Text>
      </Pressable>} ListEmptyComponent={<Text style={s.caption}>{app.loading ? '月を読み込み中…' : 'アクセスできる写真・動画がありません'}</Text>} />
    <Modal visible={all} animationType={app.state.settings.reduceMotion ? 'fade' : 'slide'} onRequestClose={() => setAll(false)}>
      <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: 64, paddingHorizontal: 22, paddingBottom: 30, gap: 18 }}>
        <Text style={s.title}>すべての月</Text><FlatList data={months} keyExtractor={x => x.month} renderItem={({ item }) => <Pressable disabled={app.busy || disabled} onPress={() => select(item.month)} accessibilityRole="button" style={{ paddingVertical: 18 }}><Text style={s.heading}>{monthLabel(item.month)}</Text><Text style={s.caption}>あと{item.total - item.reviewed}件</Text></Pressable>} />
        <Button title="閉じる" onPress={() => setAll(false)} />
      </View>
    </Modal>
  </View>;
}
