import React, {
  forwardRef, useEffect, useLayoutEffect, useRef,
} from 'react';
import mergeRefs from 'react-merge-refs';

import useEvent from 'react-use-event-hook';
import { PatternLock } from './pattern-lock';
import { DEFAULT_EXTRA_BOUNDS, DEFAULT_LIGHT_THEME, DEFAULT_THEME_STATE } from './consts';
import type {
  ReactPatternLockProps,
  TNodes,
  TPatternLockInstance,
} from './typings';
import { nodesToCode } from './utils/libs';

const useLayoutEffectSafeForSsr = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export const ReactCanvasPatternLock = forwardRef<
  TPatternLockInstance,
  ReactPatternLockProps
>(
  (
    {
      width = 315,
      height = 315,
      autoHide = false,
      autoHideTimeout = 400,
      onComplete,
      themeState,
      onDragStart,
      theme = DEFAULT_LIGHT_THEME,
      justifyNodes = 'space-around',
      rows = 3,
      cols = 3,
      extraBounds = DEFAULT_EXTRA_BOUNDS,
      hover = false,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const patternLockInnerRef = useRef<TPatternLockInstance>();

    const handleComplete = useEvent((nodes: TNodes) => {
      if (nodes?.length) {
        onComplete?.(nodesToCode(nodes, [rows, cols]), nodes);
      }
    });

    const handleDragStart = useEvent(() => {
      onDragStart?.();

      if (!themeState && patternLockInnerRef.current) {
        patternLockInnerRef.current.setThemeState(DEFAULT_THEME_STATE.INITIAL);
      }
    });

    useLayoutEffectSafeForSsr(() => {
      const patternLockVar = patternLockInnerRef;
      if (canvasRef.current) {
        mergeRefs([ref, patternLockVar])(
          new PatternLock({
            $canvas: canvasRef.current,
            autoHide,
            autoHideTimeout,
            width,
            height,
            grid: [rows, cols],
            theme,
            themeStateKey: themeState || DEFAULT_THEME_STATE.INITIAL,
            justifyNodes,
            extraBounds,
            hover,
          }),
        );

        if (patternLockVar.current) {
          patternLockVar.current.onComplete(handleComplete);
          patternLockVar.current.onStart(handleDragStart);
        }
      }

      return () => {
        patternLockVar.current?.destroy();
        patternLockInnerRef.current = undefined;
      };
    }, [
      autoHide,
      autoHideTimeout,
      width,
      height,
      justifyNodes,
      rows,
      cols,
      ref,
      theme,
      hover,
      handleComplete,
      handleDragStart,
    ]);

    useEffect(() => {
      if (themeState && patternLockInnerRef.current) {
        patternLockInnerRef.current.setThemeState(themeState);
      }
    }, [themeState]);

    return <canvas ref={canvasRef} />;
  },
);
