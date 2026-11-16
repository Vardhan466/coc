import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProctoringBadgeMeta,
  mapCameraAccessError,
  stopMediaStreamTracks,
} from './proctoring.ts';

test('mapCameraAccessError classifies permission, hardware, and busy errors cleanly', () => {
  const denied = mapCameraAccessError({ name: 'NotAllowedError' });
  assert.equal(denied.status, 'error');
  assert.match(denied.title, /Permission Denied/i);

  const missing = mapCameraAccessError({ name: 'NotFoundError' });
  assert.equal(missing.status, 'error');
  assert.match(missing.title, /No Camera Detected/i);

  const busy = mapCameraAccessError({ name: 'NotReadableError' });
  assert.equal(busy.status, 'error');
  assert.match(busy.title, /Camera Busy/i);

  const generic = mapCameraAccessError(new Error('Hardware timeout'));
  assert.equal(generic.status, 'error');
  assert.equal(generic.message, 'Hardware timeout');
});

test('getProctoringBadgeMeta returns clear labels for active and interrupted monitoring', () => {
  const active = getProctoringBadgeMeta('active');
  assert.equal(active.isLiveCamera, true);
  assert.match(active.label, /Camera Monitoring Active/i);

  const interrupted = getProctoringBadgeMeta('interrupted');
  assert.equal(interrupted.isLiveCamera, false);
  assert.match(interrupted.label, /Interrupted/i);

  const off = getProctoringBadgeMeta('off');
  assert.equal(off.isLiveCamera, false);
  assert.match(off.label, /Tab-Switch Monitor Active/i);
});

test('stopMediaStreamTracks stops every track safely without throwing', () => {
  let stoppedCount = 0;
  const mockStream = {
    getTracks: () => [
      { stop: () => { stoppedCount += 1; } },
      { stop: () => { throw new Error('already closed'); } },
    ],
  } as unknown as MediaStream;

  stopMediaStreamTracks(mockStream);
  assert.equal(stoppedCount, 1);
  assert.doesNotThrow(() => stopMediaStreamTracks(null));
});
