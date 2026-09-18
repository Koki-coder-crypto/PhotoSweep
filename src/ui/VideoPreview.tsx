import React, { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
export function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  useFocusEffect(useCallback(() => () => { player.pause(); }, [player]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') player.pause(); });
    return () => sub.remove();
  }, [player]);
  return <VideoView player={player} style={{ width: '100%', height: 270, borderRadius: 18 }} nativeControls contentFit="contain" allowsPictureInPicture={false} />;
}
