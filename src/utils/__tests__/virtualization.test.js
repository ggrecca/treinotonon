import {describe, expect, it} from "vitest";
import {getVirtualRange} from "../virtualization";

describe("getVirtualRange", ()=>{
  it("returns an empty exclusive range for an empty list", ()=>{
    expect(getVirtualRange({itemCount:0, viewportSize:300, estimatedItemSize:50})).toEqual({
      startIndex:0,
      endIndex:0,
      visibleStartIndex:0,
      visibleEndIndex:0,
      offsetTop:0,
      offsetBottom:0,
      totalSize:0,
      mountedCount:0,
      wasCapped:false,
    });
  });

  it("includes overscan without crossing the beginning of the list", ()=>{
    expect(getVirtualRange({
      itemCount:100,
      scrollOffset:0,
      viewportSize:100,
      estimatedItemSize:20,
      overscan:2,
      maxMountedItems:30,
    })).toMatchObject({
      startIndex:0,
      endIndex:7,
      visibleStartIndex:0,
      visibleEndIndex:5,
      offsetTop:0,
      offsetBottom:1860,
      mountedCount:7,
      wasCapped:false,
    });
  });

  it("handles an exact row boundary in the middle of the list", ()=>{
    expect(getVirtualRange({
      itemCount:100,
      scrollOffset:100,
      viewportSize:100,
      estimatedItemSize:20,
      overscan:2,
    })).toMatchObject({
      startIndex:3,
      endIndex:12,
      visibleStartIndex:5,
      visibleEndIndex:10,
      offsetTop:60,
      offsetBottom:1760,
    });
  });

  it("clamps excessive scroll offsets and overscan at the end", ()=>{
    expect(getVirtualRange({
      itemCount:100,
      scrollOffset:99999,
      viewportSize:100,
      estimatedItemSize:20,
      overscan:2,
    })).toMatchObject({
      startIndex:93,
      endIndex:100,
      visibleStartIndex:95,
      visibleEndIndex:100,
      offsetTop:1860,
      offsetBottom:0,
      mountedCount:7,
    });
  });

  it("caps mounted rows when overscan is larger than the safe DOM budget", ()=>{
    const range = getVirtualRange({
      itemCount:1000,
      scrollOffset:5000,
      viewportSize:500,
      estimatedItemSize:50,
      overscan:100,
      maxMountedItems:12,
    });

    expect(range).toMatchObject({
      startIndex:99,
      endIndex:111,
      visibleStartIndex:100,
      visibleEndIndex:110,
      mountedCount:12,
      wasCapped:true,
    });
    expect(range.endIndex - range.startIndex).toBeLessThanOrEqual(12);
  });

  it("mounts one useful row before a viewport has been measured", ()=>{
    expect(getVirtualRange({
      itemCount:3,
      viewportSize:0,
      estimatedItemSize:50,
      overscan:0,
    })).toMatchObject({
      startIndex:0,
      endIndex:1,
      visibleStartIndex:0,
      visibleEndIndex:1,
      mountedCount:1,
    });
  });

  it("normalizes invalid and negative numeric inputs safely", ()=>{
    expect(getVirtualRange({
      itemCount:3.9,
      scrollOffset:-100,
      viewportSize:Number.NaN,
      estimatedItemSize:0,
      overscan:-4,
      maxMountedItems:0,
    })).toMatchObject({
      startIndex:0,
      endIndex:1,
      visibleStartIndex:0,
      visibleEndIndex:1,
      totalSize:3,
      mountedCount:1,
    });
  });
});
