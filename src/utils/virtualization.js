export const DEFAULT_VIRTUAL_OVERSCAN = 5;
export const DEFAULT_MAX_MOUNTED_ITEMS = 60;

function finiteNumber(value, fallback){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegativeInteger(value, fallback=0){
  return Math.max(0, Math.floor(finiteNumber(value, fallback)));
}

/**
 * Calculates an exclusive virtual range for fixed-size rows.
 *
 * The mounted range is capped even when callers provide excessive overscan.
 * A viewport with no measured height still mounts one row so first render and
 * ResizeObserver-free environments have useful content.
 */
export function getVirtualRange({
  itemCount=0,
  scrollOffset=0,
  viewportSize=0,
  estimatedItemSize=1,
  overscan=DEFAULT_VIRTUAL_OVERSCAN,
  maxMountedItems=DEFAULT_MAX_MOUNTED_ITEMS,
}={}){
  const count = nonNegativeInteger(itemCount);
  const itemSize = Math.max(1, finiteNumber(estimatedItemSize, 1));
  const viewport = Math.max(0, finiteNumber(viewportSize, 0));
  const overscanCount = nonNegativeInteger(overscan, DEFAULT_VIRTUAL_OVERSCAN);
  const mountedLimit = Math.max(1, nonNegativeInteger(maxMountedItems, DEFAULT_MAX_MOUNTED_ITEMS));
  const totalSize = count * itemSize;

  if(count === 0){
    return {
      startIndex:0,
      endIndex:0,
      visibleStartIndex:0,
      visibleEndIndex:0,
      offsetTop:0,
      offsetBottom:0,
      totalSize:0,
      mountedCount:0,
      wasCapped:false,
    };
  }

  const maxScrollOffset = Math.max(0, totalSize - viewport);
  const offset = Math.min(Math.max(0, finiteNumber(scrollOffset, 0)), maxScrollOffset);
  const visibleStartIndex = Math.min(count - 1, Math.floor(offset / itemSize));
  const naturalVisibleEnd = Math.min(
    count,
    Math.max(visibleStartIndex + 1, Math.ceil((offset + Math.max(1, viewport)) / itemSize)),
  );
  const visibleEndIndex = Math.min(naturalVisibleEnd, visibleStartIndex + mountedLimit);

  const naturalStart = Math.max(0, visibleStartIndex - overscanCount);
  const naturalEnd = Math.min(count, visibleEndIndex + overscanCount);
  let startIndex = naturalStart;
  let endIndex = naturalEnd;
  const wasCapped = naturalEnd - naturalStart > mountedLimit || naturalVisibleEnd > visibleEndIndex;

  if(endIndex - startIndex > mountedLimit){
    const visibleCount = visibleEndIndex - visibleStartIndex;
    const spareRows = Math.max(0, mountedLimit - visibleCount);
    const rowsBefore = Math.min(visibleStartIndex, overscanCount, Math.floor(spareRows / 2));
    startIndex = visibleStartIndex - rowsBefore;
    endIndex = Math.min(count, startIndex + mountedLimit);

    if(endIndex - startIndex < mountedLimit){
      startIndex = Math.max(0, endIndex - mountedLimit);
    }
  }

  return {
    startIndex,
    endIndex,
    visibleStartIndex,
    visibleEndIndex,
    offsetTop:startIndex * itemSize,
    offsetBottom:Math.max(0, totalSize - endIndex * itemSize),
    totalSize,
    mountedCount:endIndex - startIndex,
    wasCapped,
  };
}
