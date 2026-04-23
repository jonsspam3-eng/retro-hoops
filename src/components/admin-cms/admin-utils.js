"use client";

export function moveItem(list, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function getDragPayload(event) {
  const raw = event.dataTransfer.getData("text/plain");
  return Number(raw);
}

export function setDragPayload(event, value) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(value));
}
