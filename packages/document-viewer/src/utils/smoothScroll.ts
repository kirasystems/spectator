type destination = {
  endX?: number;
  endY?: number;
};

const smoothScroll = (
  container: HTMLElement,
  destination: destination,
  duration = 200,
  done?: () => void
): void => {
  const startX = container.scrollLeft;
  const startY = container.scrollTop;
  const finalX = destination.endX ?? startX;
  const finalY = destination.endY ?? startY;
  const distanceX = finalX - startX;
  const distanceY = finalY - startY;
  const startTime = performance.now();

  const easeOut = (t: number): number => (2 - t) * t;

  const scroll = (currentTime: number): void => {
    const timeProgress = (currentTime - startTime) / duration;
    const relativeProgress = easeOut(timeProgress);
    const distanceProgressX = relativeProgress * distanceX;
    const distanceProgressY = relativeProgress * distanceY;

    if (timeProgress < 1.0) {
      container.scrollLeft = startX + distanceProgressX;
      container.scrollTop = startY + distanceProgressY;
      window.requestAnimationFrame(scroll);
    } else {
      container.scrollLeft = finalX;
      container.scrollTop = finalY;
      if (done) done();
    }
  };

  window.requestAnimationFrame(scroll);
};

export default smoothScroll;
