export type CameraProctoringStatus =
  | 'off'
  | 'requesting'
  | 'active'
  | 'interrupted'
  | 'error'
  | 'unsupported';

export interface CameraErrorInfo {
  status: CameraProctoringStatus;
  title: string;
  message: string;
}

export function mapCameraAccessError(err: unknown): CameraErrorInfo {
  const name =
    typeof err === 'object' && err !== null && 'name' in err
      ? String((err as { name?: unknown }).name || '')
      : '';
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message || '')
      : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      status: 'error',
      title: 'Camera Permission Denied',
      message:
        'Browser camera access was denied. Allow camera access in site settings to enable video monitoring, or continue with tab-switch proctoring.',
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      status: 'error',
      title: 'No Camera Detected',
      message:
        'No active webcam device was found on this device. You can retry after connecting a camera or continue with tab-switch monitoring.',
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      status: 'error',
      title: 'Camera Busy',
      message:
        'Your camera appears to be in use by another application. Close the other app and click Retry Camera.',
    };
  }

  return {
    status: 'error',
    title: 'Camera Unavailable',
    message:
      msg ||
      'Unable to initialize live camera feed right now. Anti-cheat tab-switch monitoring remains active.',
  };
}

export function getProctoringBadgeMeta(status: CameraProctoringStatus): {
  label: string;
  sublabel: string;
  isLiveCamera: boolean;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Camera Monitoring Active',
        sublabel: 'Anti-Cheat Video & Tab Guard On',
        isLiveCamera: true,
      };
    case 'interrupted':
      return {
        label: 'Camera Signal Interrupted',
        sublabel: 'Stream ended · Tab Monitor Active',
        isLiveCamera: false,
      };
    case 'requesting':
      return {
        label: 'Initializing Camera...',
        sublabel: 'Awaiting browser permission',
        isLiveCamera: false,
      };
    case 'error':
    case 'unsupported':
      return {
        label: 'Tab-Switch Monitor Only',
        sublabel: 'Camera unavailable',
        isLiveCamera: false,
      };
    case 'off':
    default:
      return {
        label: 'Tab-Switch Monitor Active',
        sublabel: 'Camera not enabled',
        isLiveCamera: false,
      };
  }
}

export function stopMediaStreamTracks(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Ignore individual track stop failures
      }
    });
  } catch {
    // Non-fatal cleanup
  }
}
