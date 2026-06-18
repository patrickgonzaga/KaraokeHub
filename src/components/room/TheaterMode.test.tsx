import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TheaterMode from './TheaterMode';
import { useRoomStore } from '../../store/useRoomStore';

// Mock framer-motion to simplify testing within jsdom
vi.mock('framer-motion', () => {
  return {
    motion: {
      div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
        <div ref={ref} {...props}>{children}</div>
      )),
      svg: React.forwardRef<SVGSVGElement, any>(({ children, ...props }, ref) => (
        <svg ref={ref} {...props}>{children}</svg>
      )),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const mockMessages = [
  { id: 'm1', nickname: 'Alice', message: 'Hello!' },
  { id: 'm2', nickname: 'Bob', message: 'Awesome song!' },
];

const mockRoomData = {
  room: { is_playing: false, playback_time: 0 },
  queue: [],
  users: [],
  messages: mockMessages,
  updatePlaybackTime: vi.fn(),
  pauseSong: vi.fn(),
  resumeSong: vi.fn(),
  skipSong: vi.fn(),
  submitScore: vi.fn(),
  completeSongWithAIScore: vi.fn(),
  clearAIScore: vi.fn(),
  startManualScoring: vi.fn(),
  endManualScoring: vi.fn(),
} as any;

describe('TheaterMode Component - TV Chat Overlay', () => {
  beforeEach(() => {
    useRoomStore.setState({ isTVMode: true });
  });

  it('renders chat overlay when isTVMode is true and messages exist', () => {
    render(<TheaterMode roomData={mockRoomData} />);
    
    expect(screen.getByText('Live Chat')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Awesome song!')).toBeInTheDocument();
  });

  it('does not render chat header when messages are empty', () => {
    const emptyRoomData = { ...mockRoomData, messages: [] };
    render(<TheaterMode roomData={emptyRoomData} />);
    
    expect(screen.queryByText('Live Chat')).not.toBeInTheDocument();
  });
});
