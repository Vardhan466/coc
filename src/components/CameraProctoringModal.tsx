import React, { useEffect, useRef, useState } from 'react';
import { TestPaper } from '../types';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Eye,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  CameraProctoringStatus,
  mapCameraAccessError,
  stopMediaStreamTracks,
} from '../utils/proctoring';

interface CameraProctoringModalProps {
  test: TestPaper | null;
  onCancel: () => void;
  onConfirmStart: (stream: MediaStream | null, cameraEnabled: boolean) => void;
}

export const CameraProctoringModal: React.FC<CameraProctoringModalProps> = ({
  test,
  onCancel,
  onConfirmStart,
}) => {
  const [status, setStatus] = useState<CameraProctoringStatus>('off');
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = false;
    setStatus('off');
    setErrorInfo(null);
    return () => {
      if (!startedRef.current) {
        stopMediaStreamTracks(streamRef.current);
      }
      streamRef.current = null;
    };
  }, [test?.id]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (stream) {
      videoEl.srcObject = stream;
      void videoEl.play().catch(() => {});
    } else {
      videoEl.srcObject = null;
    }
  }, [stream]);

  if (!test) return null;

  const qCount = test.questions?.length || test.totalQuestions || 30;
  const durationSec = test.totalDurationSeconds || qCount * (test.questionDurationSeconds || 10);

  const handleEnableCamera = async (): Promise<MediaStream | null> => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setStatus('unsupported');
      setErrorInfo({
        title: 'Camera API Unsupported',
        message:
          'This browser environment does not expose webcam access. Tab-switch and focus-loss cheating detection will still run during your exam.',
      });
      return null;
    }

    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setStatus('requesting');
    setErrorInfo(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('active');
      return mediaStream;
    } catch (err) {
      const mapped = mapCameraAccessError(err);
      setStatus(mapped.status);
      setErrorInfo({ title: mapped.title, message: mapped.message });
      return null;
    }
  };

  const handleDisableCamera = () => {
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setStatus('off');
    setErrorInfo(null);
  };

  const handleCancelModal = () => {
    startedRef.current = false;
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    onCancel();
  };

  const handleStartExamWithStream = (chosenStream: MediaStream | null, cameraActive: boolean) => {
    startedRef.current = true;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    onConfirmStart(chosenStream, cameraActive);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proctoring-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl text-slate-900 dark:text-slate-100 animate-smooth-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="proctoring-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white tracking-tight"
              >
                Enable Camera &amp; Anti-Cheat Proctoring
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {test.title} · {qCount} Questions · {durationSec}s
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelModal}
            aria-label="Cancel test launch"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Camera Preview Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
            {status === 'active' && stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    void e.currentTarget.play().catch(() => {});
                  }}
                  data-testid="proctoring-preview-video"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/85 border border-emerald-500/40 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>LIVE · Cheating Monitor Active</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisableCamera}
                  className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Turn Off Camera</span>
                </button>
              </>
            ) : (
              <div className="p-5 text-center space-y-3 max-w-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mx-auto">
                  {status === 'requesting' ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                  ) : (
                    <Camera className="w-5 h-5 text-emerald-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    {status === 'requesting'
                      ? 'Requesting Camera Permission...'
                      : errorInfo
                      ? errorInfo.title
                      : 'Camera Proctoring Ready'}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {errorInfo
                      ? errorInfo.message
                      : 'Enable your camera before starting so the live anti-cheat monitor remains visible throughout your test session.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={status === 'requesting'}
                  onClick={() => void handleEnableCamera()}
                  data-testid="enable-camera-btn"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>{errorInfo ? 'Retry Camera Access' : 'Enable Camera'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Integrity Guardrails Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Active Anti-Cheat Monitoring Rules</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Live camera monitor overlay stays visible during the test.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>2 tab switches or window blurs force-submit &amp; disqualify.</span>
              </div>
            </div>
          </div>

          {status === 'active' && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Camera connected! You will see your live monitoring indicator inside the exam.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCancelModal}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {status !== 'active' && (
              <button
                type="button"
                onClick={() => handleStartExamWithStream(null, false)}
                data-testid="proceed-without-camera-btn"
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Start Without Camera
              </button>
            )}

            <button
              type="button"
              disabled={status === 'requesting'}
              onClick={() => {
                if (status === 'active' && stream) {
                  handleStartExamWithStream(stream, true);
                } else {
                  void handleEnableCamera().then((acquired) => {
                    if (acquired) {
                      handleStartExamWithStream(acquired, true);
                    }
                  });
                }
              }}
              data-testid="start-proctored-exam-btn"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {status === 'active' ? 'Start Proctored Exam' : 'Enable Camera & Start Test'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
