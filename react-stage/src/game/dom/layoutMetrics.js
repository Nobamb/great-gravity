function createRect(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function getScreenElement(element) {
  return element?.closest?.("#screen") ?? null;
}

export function isScreenRotatedForMobile(element) {
  const screen = getScreenElement(element);

  return Boolean(
    screen?.classList.contains("screen--mobile-landscape") &&
      screen?.classList.contains("screen--viewport-portrait"),
  );
}

function getLogicalScreenRect(element) {
  const screen = getScreenElement(element);

  if (!screen || !isScreenRotatedForMobile(element)) {
    const rect = element.getBoundingClientRect();

    return createRect(rect.left, rect.top, rect.width, rect.height);
  }

  const screenRect = screen.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const logicalWidth = screen.offsetWidth || screenRect.height;
  const logicalHeight = screen.offsetHeight || screenRect.width;
  const scaleX = logicalWidth / Math.max(screenRect.height, 1);
  const scaleY = logicalHeight / Math.max(screenRect.width, 1);
  const visualLeft = elementRect.left - screenRect.left;
  const visualTop = elementRect.top - screenRect.top;
  const visualRight = elementRect.right - screenRect.left;

  return createRect(
    visualTop * scaleX,
    logicalHeight - visualRight * scaleY,
    elementRect.height * scaleX,
    elementRect.width * scaleY,
  );
}

export function getContainerLayoutRect(container) {
  return createRect(0, 0, container?.offsetWidth ?? 0, container?.offsetHeight ?? 0);
}

export function getRelativeLayoutRect(element, container) {
  if (!element || !container) {
    return createRect(0, 0, 0, 0);
  }

  if (!isScreenRotatedForMobile(container)) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return createRect(
      elementRect.left - containerRect.left,
      elementRect.top - containerRect.top,
      elementRect.width,
      elementRect.height,
    );
  }

  const elementRect = getLogicalScreenRect(element);
  const containerRect = getLogicalScreenRect(container);

  return createRect(
    elementRect.left - containerRect.left,
    elementRect.top - containerRect.top,
    elementRect.width,
    elementRect.height,
  );
}

export function getRelativePointerPosition(event, container) {
  if (!event || !container) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  const visualX = event.clientX - containerRect.left;
  const visualY = event.clientY - containerRect.top;
  const logicalWidth = container.offsetWidth || containerRect.width;
  const logicalHeight = container.offsetHeight || containerRect.height;

  if (!isScreenRotatedForMobile(container)) {
    return {
      x: visualX * (logicalWidth / Math.max(containerRect.width, 1)),
      y: visualY * (logicalHeight / Math.max(containerRect.height, 1)),
    };
  }

  return {
    x: visualY * (logicalWidth / Math.max(containerRect.height, 1)),
    y:
      logicalHeight -
      visualX * (logicalHeight / Math.max(containerRect.width, 1)),
  };
}
