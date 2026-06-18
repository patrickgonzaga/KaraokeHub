import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useRoomStore } from './useRoomStore';

const initialState = {
  userId: null,
  nickname: null,
  hostToken: null,
  pendingRoomName: null,
  isTVMode: false,
  activeTab: 'search',
  autoScoringEnabled: true,
  showFreestylePrompt: true,
  activeAIScore: null,
  floatingReactions: [],
  typingUsers: {},
  scoringQueueItemId: null,
  scoringModalVisible: false,
  passTheMicVisible: false,
};

describe('useRoomStore', () => {
  beforeEach(() => {
    // Reset Zustand store state to prevent test pollution
    useRoomStore.setState(initialState);
    localStorage.clear();
  });

  it('should initialize state with defaults', () => {
    const state = useRoomStore.getState();
    expect(state.userId).toBeNull();
    expect(state.nickname).toBeNull();
    expect(state.isTVMode).toBe(false);
    expect(state.activeTab).toBe('search');
    expect(state.autoScoringEnabled).toBe(true);
    expect(state.showFreestylePrompt).toBe(true);
  });

  it('should load states from localStorage on initializeClient', () => {
    localStorage.setItem('karaokehub_user_id', 'user-123');
    localStorage.setItem('karaokehub_nickname', 'Singer123');
    localStorage.setItem('karaokehub_host_token', 'token-abc');
    localStorage.setItem('karaokehub_tv_mode', 'true');
    localStorage.setItem('karaokehub_auto_scoring', 'false');
    localStorage.setItem('karaokehub_show_freestyle', 'false');

    useRoomStore.getState().initializeClient();

    const state = useRoomStore.getState();
    expect(state.userId).toBe('user-123');
    expect(state.nickname).toBe('Singer123');
    expect(state.hostToken).toBe('token-abc');
    expect(state.isTVMode).toBe(true);
    expect(state.autoScoringEnabled).toBe(false);
    expect(state.showFreestylePrompt).toBe(false);
  });

  it('should set nickname and persist to localStorage', () => {
    useRoomStore.getState().setNickname('Bob');

    expect(useRoomStore.getState().nickname).toBe('Bob');
    expect(localStorage.getItem('karaokehub_nickname')).toBe('Bob');
  });

  it('should toggle TV mode and persist to localStorage', () => {
    useRoomStore.getState().setTVMode(true);
    expect(useRoomStore.getState().isTVMode).toBe(true);
    expect(localStorage.getItem('karaokehub_tv_mode')).toBe('true');

    useRoomStore.getState().setTVMode(false);
    expect(useRoomStore.getState().isTVMode).toBe(false);
    expect(localStorage.getItem('karaokehub_tv_mode')).toBe('false');
  });

  it('should handle typing user status changes', () => {
    useRoomStore.getState().setTypingUser('Alice', true);
    expect(useRoomStore.getState().typingUsers).toEqual({ Alice: true });

    useRoomStore.getState().setTypingUser('Bob', true);
    expect(useRoomStore.getState().typingUsers).toEqual({ Alice: true, Bob: true });

    useRoomStore.getState().setTypingUser('Alice', false);
    expect(useRoomStore.getState().typingUsers).toEqual({ Bob: true });
  });

  describe('floating reactions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should add reaction and remove it after 2.5 seconds', () => {
      useRoomStore.getState().triggerFloatingReaction('🔥');

      const reactions = useRoomStore.getState().floatingReactions;
      expect(reactions).toHaveLength(1);
      expect(reactions[0].emoji).toBe('🔥');
      expect(reactions[0]).toHaveProperty('id');
      expect(reactions[0]).toHaveProperty('twist');
      expect(reactions[0]).toHaveProperty('offset');

      // Advance time by 2.4 seconds — reaction should still be there
      vi.advanceTimersByTime(2400);
      expect(useRoomStore.getState().floatingReactions).toHaveLength(1);

      // Advance time past 2.5 seconds — reaction should be removed
      vi.advanceTimersByTime(200);
      expect(useRoomStore.getState().floatingReactions).toHaveLength(0);
    });

    it('should clear all floating reactions immediately when clearFloatingReactions is called', () => {
      useRoomStore.getState().triggerFloatingReaction('⭐');
      useRoomStore.getState().triggerFloatingReaction('🎉');

      expect(useRoomStore.getState().floatingReactions).toHaveLength(2);

      useRoomStore.getState().clearFloatingReactions();
      expect(useRoomStore.getState().floatingReactions).toHaveLength(0);
    });
  });
});
