export const IN_NODE =
  typeof process === "object" &&
  typeof process.versions === "object" &&
  typeof process.versions.node === "string" &&
  !(process as any).browser; /* This last condition checks if we run the browser shim of process */
