import { formatStatus, truncateDescription } from './format';

describe('Format Utility Functions', () => {
  describe('formatStatus', () => {
    it('formats task status strings correctly', () => {
      expect(formatStatus('OPEN')).toBe('Open');
      expect(formatStatus('IN_PROGRESS')).toBe('In Progress');
      expect(formatStatus('DONE')).toBe('Done');
    });

    it('returns empty string for empty inputs', () => {
      expect(formatStatus('')).toBe('');
    });
  });

  describe('truncateDescription', () => {
    it('does not truncate if string is within limits', () => {
      const text = 'Short task description';
      expect(truncateDescription(text, 50)).toBe(text);
    });

    it('truncates string and appends ellipsis if limit is exceeded', () => {
      const text = 'This is a very long description that goes past the threshold limit';
      const truncated = truncateDescription(text, 20);
      expect(truncated).toBe('This is a very long...');
    });

    it('returns empty string for empty inputs', () => {
      expect(truncateDescription('')).toBe('');
    });
  });
});
