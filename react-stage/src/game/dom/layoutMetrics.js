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
  const logicalHeight = screen.offsetHeight;
  const visualLeft = elementRect.left - screenRect.left;
  const visualTop = elementRect.top - screenRect.top;
  const visualRight = elementRect.right - screenRect.left;

  return createRect(
    visualTop,
    logicalHeight - visualRight,
    elementRect.height,
    elementRect.width,
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

  if (!isScreenRotatedForMobile(container)) {
    return {
      x: visualX,
      y: visualY,
    };
  }

  return {
    x: visualY,
    y: container.offsetHeight - visualX,
  };
}
