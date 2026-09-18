import React, { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { readStorage } from '../data/storage';
import type { StorageReading } from '../domain/types';
import { formatBytes } from '../domain/media';
import { Card, Button, Progress } from './components';
import { styles as s } from './theme';
export function StorageCard() {
  const [reading, setReading] = useState<StorageReading | null>(null), [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); setReading(await readStorage()); setLoading(false); }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return <Card><Text style={s.label}>iPhoneの空き容量</Text><Text style={s.title}>{reading ? formatBytes(reading.free) : loading ? '確認中…' : '取得できませんでした'}</Text>
    {reading ? <><Progress value={Math.max(0, Math.min(1, 1 - reading.free / reading.total))} /><Text style={s.caption}>全体 {formatBytes(reading.total)} · {new Date(reading.at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}測定</Text></> : null}
    <Button title="容量を再確認" variant="ghost" onPress={() => void refresh()} />
  </Card>;
}
