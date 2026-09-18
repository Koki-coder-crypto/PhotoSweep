import {Platform} from 'react-native';
import * as Haptics from 'expo-haptics';
import {initialState} from '../src/domain/review';
import {clock} from '../src/domain/policy';
jest.mock('expo-audio',()=>({createAudioPlayer:jest.fn(),setAudioModeAsync:jest.fn()}));
jest.mock('expo-haptics',()=>({selectionAsync:jest.fn(async()=>{}),impactAsync:jest.fn(async()=>{}),notificationAsync:jest.fn(async()=>{}),ImpactFeedbackStyle:{Light:'light'},NotificationFeedbackType:{Success:'success'}}));
const {interactionFeedback}=jest.requireActual('../src/data/feedback');
afterEach(()=>{jest.restoreAllMocks();jest.clearAllMocks();});
test('haptics respect settings, distinguish selection/confirmation/success, and suppress rapid duplicates',async()=>{
 const settings=initialState(clock()).settings;let now=100000;const os=Platform.OS;Platform.OS='ios';jest.spyOn(Date,'now').mockImplementation(()=>now);
 await interactionFeedback({...settings,haptics:false},'selection');expect(Haptics.selectionAsync).not.toHaveBeenCalled();
 await interactionFeedback({...settings,haptics:true},'selection');await interactionFeedback({...settings,haptics:true},'selection');expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
 now+=150;await interactionFeedback({...settings,haptics:true},'confirm');expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
 now+=150;await interactionFeedback({...settings,haptics:true},'success');expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
 now+=150;jest.mocked(Haptics.impactAsync).mockRejectedValueOnce(Error('unavailable'));await expect(interactionFeedback({...settings,haptics:true},'confirm')).resolves.toBeUndefined();Platform.OS=os;
});
