import arg from "arg";

export function getArgs(argv) {
  const args = arg(
    {
      "--debug": Boolean,
      "-d": "--debug",
      "--host": String,
      "-h": "--host",
    },
    { argv }
  );
  return {
    isInDebug: args["--debug"] || false,
    hostname: args["--host"] || "app",
  };
}

export function parseVar(str = "") {
  return str.replace(/%/g, "");
}

export function toDashCase(str = "") {
  return str
    .toLowerCase()
    .replace(/\s/g, "-")
    .replace(/_/g, "");
}
