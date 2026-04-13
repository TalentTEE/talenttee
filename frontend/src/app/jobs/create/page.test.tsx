import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockChatCreateJob = vi.fn();
const mockCreateJob = vi.fn();

vi.mock('@/lib/api', () => ({
  chatCreateJob: (...args: unknown[]) => mockChatCreateJob(...args),
  createJob: (...args: unknown[]) => mockCreateJob(...args),
}));

import CreateJobPage from './page';

describe('CreateJobPage', () => {
  beforeEach(() => {
    mockChatCreateJob.mockReset();
    mockCreateJob.mockReset();
  });

  it('renders Chat Mode tab active by default', () => {
    render(<CreateJobPage />);
    expect(screen.getByText('Chat Mode')).toBeInTheDocument();
    expect(screen.getByText('Form Mode')).toBeInTheDocument();
    // Chat mode content should be visible
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
  });

  it('switches to Form Mode on tab click', async () => {
    const user = userEvent.setup();
    render(<CreateJobPage />);

    await user.click(screen.getByText('Form Mode'));

    expect(screen.getByText('Job Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Senior Backend Developer')).toBeInTheDocument();
  });

  it('shows initial agent greeting in chat mode', () => {
    render(<CreateJobPage />);
    expect(screen.getByText(/I'm your AI hiring assistant/)).toBeInTheDocument();
  });

  describe('Chat Mode', () => {
    it('sends user message and displays agent response', async () => {
      mockChatCreateJob.mockResolvedValue({
        complete: false,
        question: 'What are the required tech skills?',
      });

      const user = userEvent.setup();
      render(<CreateJobPage />);

      const input = screen.getByPlaceholderText('Type your answer...');
      await user.type(input, 'Backend Developer');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Backend Developer')).toBeInTheDocument();
        expect(screen.getByText('What are the required tech skills?')).toBeInTheDocument();
      });
    });

    it('calls chatCreateJob with messages on send', async () => {
      mockChatCreateJob.mockResolvedValue({
        complete: false,
        question: 'What experience level?',
      });

      const user = userEvent.setup();
      render(<CreateJobPage />);

      const input = screen.getByPlaceholderText('Type your answer...');
      await user.type(input, 'Hello');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(mockChatCreateJob).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ role: 'agent' }),
            expect.objectContaining({ role: 'user', content: 'Hello' }),
          ]),
        );
      });
    });

    it('shows job preview when chat is complete', async () => {
      mockChatCreateJob.mockResolvedValue({
        complete: true,
        jobPosting: {
          id: 'job-1',
          employerId: 'user-2',
          title: 'Senior Backend Developer',
          description: 'NestJS backend',
          requiredSkills: ['TypeScript', 'NestJS'],
          preferredSkills: [],
          salaryMin: 60000000,
          salaryMax: 80000000,
          remotePolicy: '3 days office',
          workingHours: '09:00-18:00',
          benefits: '',
          status: 'ACTIVE',
          negotiationBoundary: null,
        },
      });

      const user = userEvent.setup();
      render(<CreateJobPage />);

      const input = screen.getByPlaceholderText('Type your answer...');
      await user.type(input, 'Done');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Senior Backend Developer')).toBeInTheDocument();
        expect(screen.getByText('Job Preview')).toBeInTheDocument();
      });
    });
  });

  describe('Form Mode', () => {
    it('submits form and shows success screen', async () => {
      mockCreateJob.mockResolvedValue({
        id: 'job-new',
        title: 'Test Job',
        status: 'ACTIVE',
      });

      const user = userEvent.setup();
      render(<CreateJobPage />);

      await user.click(screen.getByText('Form Mode'));

      await user.type(screen.getByPlaceholderText('e.g. Senior Backend Developer'), 'Test Job');
      await user.type(screen.getByPlaceholderText(/Describe the role/), 'A great role');
      await user.type(screen.getByPlaceholderText(/comma-separated/), 'TypeScript, React');
      await user.type(screen.getByPlaceholderText('Minimum'), '50000000');
      await user.type(screen.getByPlaceholderText('Maximum'), '80000000');

      await user.click(screen.getByRole('button', { name: /Create Job Posting/ }));

      await waitFor(() => {
        expect(mockCreateJob).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Job',
            description: 'A great role',
            requiredSkills: ['TypeScript', 'React'],
          }),
        );
        expect(screen.getByText('Job Posting Created!')).toBeInTheDocument();
      });
    });

    it('shows skill tags while typing', async () => {
      const user = userEvent.setup();
      render(<CreateJobPage />);

      await user.click(screen.getByText('Form Mode'));
      await user.type(screen.getByPlaceholderText(/comma-separated/), 'TypeScript, React');

      await waitFor(() => {
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
      });
    });
  });
});
