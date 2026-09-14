import { describe, expect, it } from 'vitest';
import { portalAcceptsRole } from './auth';

describe('portal role verification', () => {
  it('accepts only patients in the patient portal', () => {
    expect(portalAcceptsRole('patient', 'patient')).toBe(true);
    expect(portalAcceptsRole('patient', 'doctor')).toBe(false);
    expect(portalAcceptsRole('patient', 'admin')).toBe(false);
  });

  it('accepts only approved clinical roles in the staff portal', () => {
    expect(portalAcceptsRole('staff', 'patient')).toBe(false);
    expect(portalAcceptsRole('staff', 'doctor')).toBe(true);
    expect(portalAcceptsRole('staff', 'admin')).toBe(true);
  });
});
