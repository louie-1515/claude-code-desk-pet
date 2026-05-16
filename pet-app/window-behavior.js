const SNAP_MARGIN = 24;
const SNAP_THRESHOLD = 24;

export function defaultWindowPosition({ workArea, windowSize, margin = SNAP_MARGIN }) {
  return {
    x: workArea.x + workArea.width - windowSize.width - margin,
    y: workArea.y + workArea.height - windowSize.height - margin
  };
}

export function clampPositionToWorkArea({ point, workArea, windowSize }) {
  const minX = workArea.x;
  const minY = workArea.y;
  const maxX = workArea.x + workArea.width - windowSize.width;
  const maxY = workArea.y + workArea.height - windowSize.height;
  return {
    x: Math.min(Math.max(point.x, minX), maxX),
    y: Math.min(Math.max(point.y, minY), maxY)
  };
}

export function settleDraggedWindowPosition({ point, workArea, windowSize }) {
  return clampPositionToWorkArea({ point, workArea, windowSize });
}

export function windowCenterPoint({ point, windowSize }) {
  return {
    x: Math.round(point.x + windowSize.width / 2),
    y: Math.round(point.y + windowSize.height / 2)
  };
}

export function snapWindowPosition({
  point,
  workArea,
  windowSize,
  threshold = SNAP_THRESHOLD,
  margin = SNAP_MARGIN
}) {
  const clamped = clampPositionToWorkArea({ point, workArea, windowSize });
  const snapLeft = workArea.x + margin;
  const snapTop = workArea.y + margin;
  const snapRight = workArea.x + workArea.width - windowSize.width - margin;
  const snapBottom = workArea.y + workArea.height - windowSize.height - margin;

  return {
    x: Math.abs(clamped.x - snapLeft) <= threshold
      ? snapLeft
      : Math.abs(clamped.x - snapRight) <= threshold
        ? snapRight
        : clamped.x,
    y: Math.abs(clamped.y - snapTop) <= threshold
      ? snapTop
      : Math.abs(clamped.y - snapBottom) <= threshold
        ? snapBottom
        : clamped.y
  };
}
