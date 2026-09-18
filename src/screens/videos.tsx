import React, { useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppContext';
import { Button, Card, Page, Progress } from '../ui/components';
import { VideoPreview } from '../ui/VideoPreview';
import { PhotoTile } from './cleanup';
import { palette as p, styles as s } from '../ui/theme';
import { formatBytes } from '../domain/media';
import { hasPro, remaining } from '../domain/policy';
import { compression } from '../data/compression';
import { mayStageOriginal, type CompressionAdapter, type CompressionJob } from '../domain/compression';
import { go, run } from './actions';

export function Videos() {
  const app = useApp(), params = useLocalSearchParams<{ recordings?: string; compress?: string }>();
  const [selected, setSelected] = useState<Set<string>>(new Set()), [working, setWorking] = useState(false);
  const guard = useRef(false);
  const videos = app.photos.filter(p => p.kind === 'video' && (params.recordings !== '1' || p.screenRecording));
  videos.sort((a, b) => (app.state.sizes?.[b.id]?.bytes ?? -1) - (app.state.sizes?.[a.id]?.bytes ?? -1));
  const submit = async () => {
    if (guard.current || !selected.size) return;
    guard.current = true; setWorking(true);
    try {
      const accessible = new Set(videos.map(video => video.id));
      const ids = [...selected].filter(id => accessible.has(id));
      if (ids.length !== selected.size) { setSelected(new Set(ids)); throw new Error('動画へのアクセス範囲が変わりました。選択内容を確認してください。'); }
      await app.stageCandidates(ids); setSelected(new Set()); go('/candidates');
    }
    catch (e) { app.notify(e instanceof Error ? e.message : '候補を保存できませんでした。'); }
    finally { guard.current = false; setWorking(false); }
  };
  return <Page title={params.compress === '1' ? '圧縮する動画を選ぶ' : params.recordings === '1' ? '画面収録' : '大きい動画'} back scroll={false} footer={params.compress !== '1' ? <Button title={`${selected.size}本を候補に入れる`} disabled={!selected.size || working || app.busy} onPress={() => void submit()} /> : undefined}>
    <Text style={s.caption}>サイズ確認済みの大きい順。未確認の動画は下に表示します。{app.permission === 'limited' ? '選択した動画のみ表示中。' : ''}</Text>
    {!hasPro(app.entitlement, Date.now()) ? <Text style={s.caption}>今日の無料分 あと{remaining(app.state, 'video')}本</Text> : null}
    <FlatList data={videos} keyExtractor={x => x.id} ListEmptyComponent={<Text style={s.body}>{app.loading ? '読み込み中…' : app.libraryError || 'アクセスできる対象の動画がありません。'}</Text>}
      renderItem={({ item }) => <Card><View style={{ flexDirection: 'row', gap: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="動画を再生" onPress={() => go(`/zoom?id=${encodeURIComponent(item.id)}`)} style={{ width: 90, height: 105, borderRadius: 12, overflow: 'hidden' }}><PhotoTile photo={item} /></Pressable>
        <View style={{ flex: 1, gap: 5 }}><Text style={s.heading}>{app.state.sizes?.[item.id]?.bytes != null ? formatBytes(app.state.sizes![item.id]!.bytes!) : app.state.sizes?.[item.id] ? 'サイズ不明' : 'サイズ確認中'}</Text><Text style={s.caption}>{new Date(item.createdAt).toLocaleDateString('ja-JP')} · {Math.floor((item.duration || 0) / 60)}:{String(Math.floor((item.duration || 0) % 60)).padStart(2, '0')}</Text>
          {params.compress === '1' ? <Button title="この動画を圧縮" onPress={() => go(`/compress?id=${encodeURIComponent(item.id)}`)} /> : <Button title={selected.has(item.id) ? '選択を外す' : '削除候補に選ぶ'} variant={selected.has(item.id) ? 'primary' : 'secondary'} disabled={working || app.busy} onPress={() => setSelected(old => { const next = new Set(old); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} />}
        </View>
      </View></Card>} />
  </Page>;
}

export function Compress({ adapter = compression, initialId }: { adapter?: CompressionAdapter; initialId?: string } = {}) {
  const app = useApp(), params = useLocalSearchParams<{ id?: string }>();
  const [job, setJob] = useState<CompressionJob>({ id: '', assetId: '', phase: 'idle' });
  const [preset, setPreset] = useState<'1080' | '720'>('1080'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false), active = ['preparing', 'encoding', 'saving'].includes(job.phase);
  useEffect(() => {
    let alive = true, polling = false;
    const refresh = async () => { if (polling) return; polling = true; try { const next = await adapter.status(); if (alive) setJob(next); } catch (e) { if (alive) setError(e instanceof Error ? e.message : '処理の状態を確認できません。'); } finally { polling = false; } };
    void refresh(); const timer = setInterval(() => void refresh(), 500);
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') void adapter.cancel().catch(() => {}); });
    return () => { alive = false; clearInterval(timer); sub.remove(); void adapter.cancel().catch(() => {}); };
  }, [adapter]);
  const task = async (fn: () => Promise<CompressionJob>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { setJob(await fn()); } catch (e) { setError(e instanceof Error ? e.message : '処理を完了できませんでした。'); } finally { lock.current = false; setBusy(false); }
  };
  const start = () => {
    if (!hasPro(app.entitlement, Date.now())) { go('/paywall?source=compression'); return; }
    if (params.id || initialId) void task(() => adapter.start((params.id || initialId)!, preset));
  };
  return <Page title="動画を小さくする" back>
    <Text style={s.body}>見比べてから保存。元の動画は、確認して削除するまで残ります。</Text>
    <Card><Text style={s.heading}>画質を選ぶ</Text><Button title="標準 · 最大1080p" variant={preset === '1080' ? 'primary' : 'secondary'} disabled={active} onPress={() => setPreset('1080')} /><Button title="小さめ · 最大720p" variant={preset === '720' ? 'primary' : 'secondary'} disabled={active} onPress={() => setPreset('720')} />
      <Text style={s.caption}>通常のSDR動画・画面収録に対応。HDR・スローモーション・編集済み動画は対象外です。iCloud上の原本は開始後にダウンロードします。通信量と作業用の空き容量が必要です。</Text>
      {!active && !['unknown', 'ready'].includes(job.phase) ? <Button title={hasPro(app.entitlement, Date.now()) ? '圧縮を開始' : 'Proで動画を圧縮する'} disabled={busy || !(params.id || initialId)} onPress={start} /> : null}
    </Card>
    {job.assetId && job.assetId !== (params.id || initialId) ? <Text style={s.caption}>前に選んだ動画の処理結果を表示しています。新しく開始すると切り替わります。</Text> : null}
    {active ? <Card><Text style={s.heading}>{job.phase === 'preparing' ? '原本を準備中' : job.phase === 'saving' ? '保存を確認中' : '動画を変換中'}</Text><Progress value={job.progress || 0} /><Text style={s.caption}>画面を開いたままお待ちください。途中でやめても原本は残ります。</Text>{job.phase !== 'saving' ? <Button title="中断する" variant="secondary" onPress={() => void adapter.cancel()} /> : null}</Card> : null}
    {['ready', 'saved', 'not-smaller'].includes(job.phase) ? <>
      <Text style={s.heading}>元の動画 · {formatBytes(job.inputBytes || 0)}</Text>{job.inputUri ? <VideoPreview uri={job.inputUri} /> : null}
      <Text style={s.heading}>圧縮後 · {formatBytes(job.outputBytes || 0)}</Text>{job.outputUri ? <VideoPreview uri={job.outputUri} /> : null}
      <Text style={s.body}>{job.phase === 'not-smaller' ? '今回は小さくなりませんでした。コピーは保存していません。' : `動画のサイズ差 ${formatBytes(Math.max(0, (job.inputBytes || 0) - (job.outputBytes || 0)))}。端末の空き容量の増加量ではありません。`}</Text>
      {job.phase === 'ready' ? <><Button title="圧縮動画を保存する" disabled={busy} onPress={() => void task(() => adapter.save(job.id))} /><Button title="未保存の出力を破棄してやり直す" variant="ghost" disabled={busy} onPress={start} /></> : null}
    </> : null}
    {mayStageOriginal(job) ? <Card><Text style={s.heading}>圧縮動画を保存しました</Text><Text style={s.caption}>両方残すと、保存した動画の分だけ使用容量が増えます。</Text><Button title="原本を削除候補にする" disabled={app.busy || busy} onPress={() => void run(app, async () => { await app.stageCandidates([job.assetId]); await app.reload(); go('/candidates'); })} /><Button title="両方残して終了" variant="secondary" onPress={() => { void app.reload(); router.back(); }} /></Card> : null}
    {job.phase === 'unknown' ? <Card><Text style={s.heading}>保存結果を確認できません</Text><Text style={s.body}>重複を防ぐため再保存はしていません。写真へのアクセスを確認してから再確認してください。原本は残っています。</Text><Button title="保存結果を再確認" onPress={() => void task(() => adapter.status())} /></Card> : null}
    {error || job.message ? <Text accessibilityRole="alert" style={{ color: p.rose }}>{error || job.message}</Text> : null}
  </Page>;
}
