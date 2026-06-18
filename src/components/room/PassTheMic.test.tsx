import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PassTheMic from './PassTheMic';
import { useRoomStore } from '../../store/useRoomStore';
import confetti from 'canvas-confetti';

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

const mockUsers = [
  { nickname: 'Alice', is_online: true },
  { nickname: 'Bob', is_online: true },
  { nickname: 'Charlie', is_online: false },
];

const mockRoomData = {
  users: mockUsers,
} as any;

describe('PassTheMic Component', () => {
  beforeEach(() => {
    useRoomStore.setState({ passTheMicVisible: true });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when passTheMicVisible is false', () => {
    useRoomStore.setState({ passTheMicVisible: false });
    const { container } = render(<PassTheMic roomData={mockRoomData} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with title, draw candidates, and control buttons', () => {
    render(<PassTheMic roomData={mockRoomData} />);
    
    expect(screen.getByText('Pass The Mic')).toBeInTheDocument();
    expect(screen.getByText(/Draw Candidates/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SPIN WHEEL/i })).toBeInTheDocument();
  });

  it('includes offline users when checkbox is checked, and handles candidate volunteer toggle', () => {
    render(<PassTheMic roomData={mockRoomData} />);
    
    // Checkbox is checked by default
    const offlineCheckbox = screen.getByLabelText(/Include Offline/i) as HTMLInputElement;
    expect(offlineCheckbox.checked).toBe(true);

    // Toggle volunteering for 'Alice' who is online by default
    const aliceBtn = screen.getByRole('button', { name: /Alice/i });
    expect(aliceBtn).toHaveClass('bg-purple-950/20');

    // Click to remove her
    fireEvent.click(aliceBtn);
    expect(aliceBtn).not.toHaveClass('bg-purple-950/20');

    // Charlie is offline but should be visible in the pool
    const charlieBtn = screen.getByRole('button', { name: /Charlie/i });
    expect(charlieBtn).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it('spins the wheel, picks a winner, and triggers confetti', async () => {
    render(<PassTheMic roomData={mockRoomData} />);
    
    const spinBtn = screen.getByRole('button', { name: /SPIN WHEEL/i });
    fireEvent.click(spinBtn);
    
    // Should enter spinning state
    expect(screen.getByRole('button', { name: /SPINNING ROULETTE.../i })).toBeInTheDocument();
    expect(spinBtn).toBeDisabled();

    // Fast-forward 4.5 seconds for animation to complete
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });

    // Should display selected singer and post-spin controls
    expect(screen.getByText(/Selected Singer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /START SINGING/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SPIN AGAIN/i })).toBeInTheDocument();

    // Confetti should have been triggered
    expect(confetti).toHaveBeenCalledOnce();
  });
});
