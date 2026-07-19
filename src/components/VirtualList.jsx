import React, {forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {
  DEFAULT_MAX_MOUNTED_ITEMS,
  DEFAULT_VIRTUAL_OVERSCAN,
  getVirtualRange,
} from "../utils/virtualization";

const DEFAULT_THRESHOLD = 40;
const DEFAULT_VIEWPORT_HEIGHT = 420;
const useSafeLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function finiteNumber(value, fallback){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function defaultItemKey(item, index){
  if(item && typeof item === "object") return item.id ?? item.key ?? index;
  if(typeof item === "string" || typeof item === "number") return item;
  return index;
}

function assignRef(ref, value){
  if(typeof ref === "function") ref(value);
  else if(ref) ref.current = value;
}

/**
 * A dependency-free fixed-estimate virtual list.
 *
 * `estimatedItemSize` should include any intended gap between rows. The outer
 * element owns scrolling, so its scroll offset survives ordinary item and
 * parent re-renders. `initialScrollOffset` and `onScrollOffsetChange` allow a
 * parent to restore that position after an intentional unmount.
 */
export const VirtualList = forwardRef(function VirtualList({
  items=[],
  renderItem,
  getItemKey=defaultItemKey,
  estimatedItemSize=64,
  threshold=DEFAULT_THRESHOLD,
  overscan=DEFAULT_VIRTUAL_OVERSCAN,
  maxMountedItems=DEFAULT_MAX_MOUNTED_ITEMS,
  height=DEFAULT_VIEWPORT_HEIGHT,
  initialScrollOffset=0,
  onScrollOffsetChange,
  onScroll,
  ariaLabel="Lista",
  countLabel,
  className="",
  itemClassName="",
  itemStyle,
  emptyState=null,
  style,
  ...rest
}, forwardedRef){
  const listItems = Array.isArray(items) ? items : [];
  const itemCount = listItems.length;
  const resolvedItemSize = Math.max(1, finiteNumber(estimatedItemSize, 64));
  const mountedLimit = Math.max(1, Math.floor(finiteNumber(maxMountedItems, DEFAULT_MAX_MOUNTED_ITEMS)));
  const normalRenderLimit = Math.min(
    mountedLimit,
    Math.max(0, Math.floor(finiteNumber(threshold, DEFAULT_THRESHOLD))),
  );
  const shouldVirtualize = itemCount > normalRenderLimit;
  const numericHeight = typeof height === "number" ? Math.max(0, height) : 0;
  const initialOffset = Math.max(0, finiteNumber(initialScrollOffset, 0));
  const internalRef = useRef(null);
  const preservedScrollOffsetRef = useRef(initialOffset);
  const restoredInitialOffsetRef = useRef(false);
  const [scrollOffset,setScrollOffset] = useState(initialOffset);
  const [viewportSize,setViewportSize] = useState(numericHeight);

  const setListRef = useCallback(node=>{
    internalRef.current = node;
    assignRef(forwardedRef, node);
  },[forwardedRef]);

  const measureViewport = useCallback(()=>{
    const element = internalRef.current;
    const nextSize = Math.max(0, element?.clientHeight || numericHeight);
    setViewportSize(current => current === nextSize ? current : nextSize);
  },[numericHeight]);

  useSafeLayoutEffect(()=>{
    const element = internalRef.current;
    if(!element) return undefined;

    if(!restoredInitialOffsetRef.current){
      element.scrollTop = preservedScrollOffsetRef.current;
      restoredInitialOffsetRef.current = true;
    }
    measureViewport();

    const ResizeObserverClass = globalThis.ResizeObserver;
    if(typeof ResizeObserverClass === "function"){
      const observer = new ResizeObserverClass(measureViewport);
      observer.observe(element);
      return ()=>observer.disconnect();
    }

    globalThis.window?.addEventListener?.("resize", measureViewport);
    return ()=>globalThis.window?.removeEventListener?.("resize", measureViewport);
  },[measureViewport]);

  const range = useMemo(()=>getVirtualRange({
    itemCount,
    scrollOffset,
    viewportSize,
    estimatedItemSize:resolvedItemSize,
    overscan,
    maxMountedItems:mountedLimit,
  }),[itemCount, scrollOffset, viewportSize, resolvedItemSize, overscan, mountedLimit]);

  useSafeLayoutEffect(()=>{
    const element = internalRef.current;
    if(!element) return;
    if(!shouldVirtualize){
      const currentOffset = Math.max(0, element.scrollTop);
      preservedScrollOffsetRef.current = currentOffset;
      setScrollOffset(value => value === currentOffset ? value : currentOffset);
      return;
    }
    const maximumOffset = Math.max(0, range.totalSize - viewportSize);
    if(element.scrollTop <= maximumOffset) return;
    const nextOffset = Math.min(preservedScrollOffsetRef.current, maximumOffset);
    element.scrollTop = nextOffset;
    preservedScrollOffsetRef.current = nextOffset;
    setScrollOffset(nextOffset);
  },[shouldVirtualize, range.totalSize, viewportSize]);

  const handleScroll = event => {
    const nextOffset = Math.max(0, event.currentTarget.scrollTop);
    preservedScrollOffsetRef.current = nextOffset;
    setScrollOffset(nextOffset);
    onScrollOffsetChange?.(nextOffset);
    onScroll?.(event);
  };

  const startIndex = shouldVirtualize ? range.startIndex : 0;
  const endIndex = shouldVirtualize ? range.endIndex : itemCount;
  const renderedItems = listItems.slice(startIndex, endIndex);
  const resolvedCountLabel = countLabel || `${itemCount} ${itemCount === 1 ? "item" : "itens"}`;
  const resolvedAriaLabel = [ariaLabel, resolvedCountLabel].filter(Boolean).join(". ");
  const viewportStyle = {
    WebkitOverflowScrolling:"touch",
    overflowY:"auto",
    overscrollBehavior:"contain",
    ...(shouldVirtualize ? {height} : {maxHeight:height}),
    ...style,
  };

  return <div
    {...rest}
    ref={setListRef}
    role="list"
    aria-label={resolvedAriaLabel}
    className={className}
    style={viewportStyle}
    data-virtualized={shouldVirtualize ? "true" : "false"}
    data-mounted-count={renderedItems.length}
    onScroll={handleScroll}
  >
    {shouldVirtualize && range.offsetTop > 0 && <div role="presentation" aria-hidden="true" style={{height:range.offsetTop}} />}
    {itemCount === 0 && emptyState !== null ? <div role="listitem">{emptyState}</div> : renderedItems.map((item, offsetIndex)=>{
      const index = startIndex + offsetIndex;
      const key = getItemKey(item, index);
      return <div
        role="listitem"
        aria-posinset={index + 1}
        aria-setsize={itemCount}
        className={itemClassName}
        key={key ?? index}
        style={{minHeight:resolvedItemSize, ...itemStyle}}
      >
        {typeof renderItem === "function" ? renderItem(item, index, {virtualized:shouldVirtualize}) : null}
      </div>;
    })}
    {shouldVirtualize && range.offsetBottom > 0 && <div role="presentation" aria-hidden="true" style={{height:range.offsetBottom}} />}
  </div>;
});
