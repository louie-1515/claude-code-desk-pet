export function getPointerPoint(screenApi, fallbackPoint) {
  if (typeof screenApi?.getCursorScreenPoint === "function") {
    const point = screenApi.getCursorScreenPoint();
    return {
      x: Math.round(point.x),
      y: Math.round(point.y)
    };
  }
  if (fallbackPoint && typeof fallbackPoint.x === "number") {
    return {
      x: Math.round(fallbackPoint.x),
      y: Math.round(fallbackPoint.y)
    };
  }
  return { x: 0, y: 0 };
}

export function normalizeScreenPoint(screenApi, point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}
