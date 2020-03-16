const ANNOTATION_COLORS: string[] = [
  "#a6cee3", // light-blue
  "#1f78b4", // blue
  "#b2df8a", // light-green
  "#33a02c", // green
  "#fb9a99", // light-red
  "#e31a1c", // red
  "#fdbf6f", // light-orange
  "#ff7f00", // orange
  "#cab2d6", // light-purple
  "#6a3d9a", // purple
  "#ff9", // beige
  "#b15928", // brown
];

function hashString(str: string): number {
  return str.split("").reduce(function(a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}

export function topicToColor(topic: string): string {
  return ANNOTATION_COLORS[Math.abs(hashString(topic) % ANNOTATION_COLORS.length)];
}
