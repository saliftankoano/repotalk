export function getSelectedRepo(): string {
  if (typeof window !== "undefined") {
    const storedRepo = localStorage.getItem("selectedRepo");
    return storedRepo || "Choose a repo";
  } else {
    // Default model
    return "Choose a repo";
  }
}
