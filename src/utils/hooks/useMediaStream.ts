import { useEffect, useRef } from 'react';

import type { GetMediaStreamConstraintsParams, MediaTrackConstraintsOptions } from '../helpers';
import {
  applyMediaStreamConstraints,
  getMediaStream,
  getMediaStreamConstraints,
  stopMediaStream
} from '../helpers';

import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export interface UseMediaStreamParams extends MediaTrackConstraintsOptions {
  disable?: boolean;
  requestTimeLimit?: number;
  applyConstraints?: boolean;
  audioConstraints?: MediaTrackConstraints;
  videoConstraints?: MediaTrackConstraints;
  onStreamRequest?: () => void;
  onStreamError?: (error: Error) => void;
  onStreamStart?: (stream: MediaStream) => void;
  onStreamStop?: (stream?: MediaStream) => void;
}

export const useMediaStream = ({
  onStreamRequest,
  onStreamError,
  onStreamStart,
  onStreamStop,
  disable,
  applyConstraints,
  requestTimeLimit,
  videoConstraints,
  audioConstraints,
  cameraResolutionMode,
  cameraResolutionType,
  frontCamera,
  mainCamera,
  muted
}: UseMediaStreamParams = {}) => {
  const streamRef = useRef<MediaStream>();
  const handlerRef = useRef({
    request: onStreamRequest,
    error: onStreamError,
    start: onStreamStart,
    stop: onStreamStop
  });

  useIsomorphicLayoutEffect(() => {
    handlerRef.current = {
      request: onStreamRequest,
      error: onStreamError,
      start: onStreamStart,
      stop: onStreamStop
    };
  }, [onStreamRequest, onStreamError, onStreamStart, onStreamStop]);

  useEffect(() => {
    if (disable) return;

    const streamConstraintsParams: GetMediaStreamConstraintsParams = {
      constraints: {
        video: videoConstraints,
        audio: audioConstraints
      },
      options: {
        cameraResolutionMode,
        cameraResolutionType,
        frontCamera,
        mainCamera,
        muted
      }
    };

    const requesMediaStream = async (params: GetMediaStreamConstraintsParams) => {
      try {
        if (handlerRef.current.request) {
          handlerRef.current.request();
        }

        const mediaStream = await getMediaStream(params, requestTimeLimit);

        if (!handlerRef.current.start) return;
        handlerRef.current.start(mediaStream);
      } catch (error) {
        if (!handlerRef.current.error) return;
        handlerRef.current.error(error as Error);
      }
    };

    const runningStream = streamRef.current;
    if (applyConstraints && runningStream) {
      getMediaStreamConstraints(streamConstraintsParams)
        .then((constraints) => applyMediaStreamConstraints(runningStream, constraints))
        .catch(() => requesMediaStream(streamConstraintsParams));
    } else {
      requesMediaStream(streamConstraintsParams);
    }

    return () => {
      if (handlerRef.current.stop) {
        handlerRef.current.stop(runningStream);
      }
      if (!runningStream) return;
      stopMediaStream(runningStream);
    };
  }, [
    // STREAM PARAMS:
    disable,
    applyConstraints,
    requestTimeLimit,
    // DEFAULT CONSTRAINTS:
    videoConstraints,
    audioConstraints,
    // CUSTOM CONSTRAINTS:
    cameraResolutionMode,
    cameraResolutionType,
    frontCamera,
    mainCamera,
    muted
  ]);

  return streamRef.current;
};
